package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	ctx := context.Background()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer pool.Close()

	_, err = pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		filename TEXT PRIMARY KEY,
		applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
	)`)
	if err != nil {
		log.Fatalf("Failed to create schema_migrations table: %v", err)
	}

	migrationDir := "migrations"
	if len(os.Args) > 1 {
		migrationDir = os.Args[1]
	}

	files, err := filepath.Glob(filepath.Join(migrationDir, "*.sql"))
	if err != nil {
		log.Fatalf("Failed to list migrations: %v", err)
	}

	sort.Strings(files)

	applied := 0
	for _, file := range files {
		name := filepath.Base(file)

		var exists bool
		err := pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename = $1)", name).Scan(&exists)
		if err != nil {
			log.Fatalf("Failed to check migration %s: %v", name, err)
		}
		if exists {
			fmt.Printf("  ⏭️  %s (already applied)\n", name)
			continue
		}

		log.Printf("Running migration: %s ...", name)

		sql, err := os.ReadFile(file)
		if err != nil {
			log.Fatalf("Failed to read %s: %v", name, err)
		}

		statements := splitSQL(string(sql))
		for i, stmt := range statements {
			stmt = strings.TrimSpace(stmt)
			if stmt == "" {
				continue
			}
			_, err := pool.Exec(ctx, stmt)
			if err != nil {
				log.Fatalf("Error in %s (statement %d): %v\nSQL: %s", name, i+1, err, stmt[:min(len(stmt), 200)])
			}
		}

		_, err = pool.Exec(ctx, "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING", name)
		if err != nil {
			log.Fatalf("Failed to record migration %s: %v", name, err)
		}

		fmt.Printf("  ✅ %s\n", name)
		applied++
	}

	if applied == 0 {
		log.Println("No new migrations to apply")
	} else {
		log.Printf("Applied %d migration(s) successfully", applied)
	}
}

func splitSQL(sql string) []string {
	var result []string
	current := strings.Builder{}
	for _, line := range strings.Split(sql, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "--") {
			continue
		}
		current.WriteString(line + "\n")
		if strings.HasSuffix(strings.TrimSpace(line), ";") {
			result = append(result, current.String())
			current.Reset()
		}
	}
	if current.Len() > 0 && strings.TrimSpace(current.String()) != "" {
		result = append(result, current.String())
	}
	return result
}
