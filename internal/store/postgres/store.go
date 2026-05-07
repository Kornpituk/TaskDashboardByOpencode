package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/google/uuid"
)

type Store struct {
	db *pgxpool.Pool
}

func NewStore(ctx context.Context, databaseURL string) (*Store, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database URL: %w", err)
	}

	config.MaxConns = 10
	config.MinConns = 2

	db, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}

	if err := db.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &Store{db: db}, nil
}

func (s *Store) Close() {
	s.db.Close()
}

type User struct {
	ID           string
	Email        string
	Name         string
	Initials     string
	Role         string
	AvatarClass  string
	TeamLeader   bool
	PasswordHash string
	CreatedAt    time.Time
}

type Session struct {
	ID        string
	UserID    string
	ExpiresAt time.Time
	CreatedAt time.Time
}

type Task struct {
	ID            string
	Title         string
	Description   string
	Status        string
	Priority      string
	OwnerID       string
	DueDate       *time.Time
	Labels        []string
	CommentsCount int
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type TeamMember struct {
	ID             string
	Name           string
	Initials       string
	AvatarClass    string
	Role           string
	TeamLeader     bool
	TaskCount      int
	CompletedTasks int
}

type TaskStats struct {
	TotalTasks     int
	Backlog        int
	Todo           int
	InProgress     int
	Done           int
	HighPriority   int
	MediumPriority int
	LowPriority    int
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	query := `SELECT id, email, name, initials, role, avatar_class, team_leader, password_hash, created_at 
			  FROM users WHERE email = $1`

	var u User
	err := s.db.QueryRow(ctx, query, email).Scan(
		&u.ID, &u.Email, &u.Name, &u.Initials, &u.Role, &u.AvatarClass,
		&u.TeamLeader, &u.PasswordHash, &u.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *Store) GetUserByID(ctx context.Context, id string) (*User, error) {
	query := `SELECT id, email, name, initials, role, avatar_class, team_leader, password_hash, created_at 
			  FROM users WHERE id = $1`

	var u User
	err := s.db.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Email, &u.Name, &u.Initials, &u.Role, &u.AvatarClass,
		&u.TeamLeader, &u.PasswordHash, &u.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (s *Store) CreateSession(ctx context.Context, userID string) (*Session, error) {
	id := uuid.New().String()
	expiresAt := time.Now().Add(24 * time.Hour)

	query := `INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`
	_, err := s.db.Exec(ctx, query, id, userID, expiresAt)
	if err != nil {
		return nil, err
	}

	return &Session{
		ID:        id,
		UserID:    userID,
		ExpiresAt: expiresAt,
		CreatedAt: time.Now(),
	}, nil
}

func (s *Store) GetSession(ctx context.Context, sessionID string) (*Session, error) {
	query := `SELECT id, user_id, expires_at, created_at FROM sessions 
			  WHERE id = $1 AND expires_at > CURRENT_TIMESTAMP`

	var sesh Session
	err := s.db.QueryRow(ctx, query, sessionID).Scan(
		&sesh.ID, &sesh.UserID, &sesh.ExpiresAt, &sesh.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &sesh, nil
}

func (s *Store) DeleteSession(ctx context.Context, sessionID string) error {
	query := `DELETE FROM sessions WHERE id = $1`
	_, err := s.db.Exec(ctx, query, sessionID)
	return err
}

func (s *Store) ListTasks(ctx context.Context, userID string, userRole string, statusFilter string) ([]Task, error) {
	var query string
	var args []interface{}

	if userRole == "manager" {
		query = `SELECT id, title, description, status, priority, owner_id, due_date, labels, comments_count, created_at, updated_at 
				 FROM tasks`
		args = []interface{}{}
	} else {
		query = `SELECT id, title, description, status, priority, owner_id, due_date, labels, comments_count, created_at, updated_at 
				 FROM tasks WHERE owner_id = $1`
		args = []interface{}{userID}
	}

	if statusFilter != "" {
		if userRole == "manager" {
			query += ` WHERE status = $1`
			args = []interface{}{statusFilter}
		} else {
			query += ` AND status = $2`
			args = []interface{}{userID, statusFilter}
		}
	}

	query += ` ORDER BY created_at DESC`

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []Task
	for rows.Next() {
		var t Task
		var dueDate sql.NullTime
		var labelsJSON []byte

		err := rows.Scan(
			&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority,
			&t.OwnerID, &dueDate, &labelsJSON, &t.CommentsCount,
			&t.CreatedAt, &t.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if dueDate.Valid {
			t.DueDate = &dueDate.Time
		}

		if labelsJSON != nil {
			json.Unmarshal(labelsJSON, &t.Labels)
		}

		tasks = append(tasks, t)
	}

	return tasks, nil
}

func (s *Store) GetTask(ctx context.Context, taskID string) (*Task, error) {
	query := `SELECT id, title, description, status, priority, owner_id, due_date, labels, comments_count, created_at, updated_at 
			  FROM tasks WHERE id = $1`

	var t Task
	var dueDate sql.NullTime
	var labelsJSON []byte

	err := s.db.QueryRow(ctx, query, taskID).Scan(
		&t.ID, &t.Title, &t.Description, &t.Status, &t.Priority,
		&t.OwnerID, &dueDate, &labelsJSON, &t.CommentsCount,
		&t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if dueDate.Valid {
		t.DueDate = &dueDate.Time
	}

	if labelsJSON != nil {
		json.Unmarshal(labelsJSON, &t.Labels)
	}

	return &t, nil
}

func (s *Store) CreateTask(ctx context.Context, task *Task) error {
	labelsJSON, err := json.Marshal(task.Labels)
	if err != nil {
		return err
	}

	query := `INSERT INTO tasks (id, title, description, status, priority, owner_id, due_date, labels, comments_count)
			  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	_, err = s.db.Exec(ctx, query,
		task.ID, task.Title, task.Description, task.Status, task.Priority,
		task.OwnerID, task.DueDate, labelsJSON, task.CommentsCount,
	)
	return err
}

func (s *Store) UpdateTask(ctx context.Context, taskID string, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	query := "UPDATE tasks SET updated_at = CURRENT_TIMESTAMP"
	args := []interface{}{taskID}
	i := 2

	for field, value := range updates {
		if field == "labels" {
			labelsJSON, err := json.Marshal(value)
			if err != nil {
				return err
			}
			query += fmt.Sprintf(", %s = $%d", field, i)
			args = append(args, labelsJSON)
		} else {
			query += fmt.Sprintf(", %s = $%d", field, i)
			args = append(args, value)
		}
		i++
	}

	query += " WHERE id = $1"

	_, err := s.db.Exec(ctx, query, args...)
	return err
}

func (s *Store) ListTeamMembers(ctx context.Context) ([]TeamMember, error) {
	query := `SELECT u.id, u.name, u.initials, u.avatar_class, u.role, u.team_leader,
			  COUNT(t.id) as task_count,
			  COUNT(CASE WHEN t.status = 'Done' THEN 1 END) as completed_count
			  FROM users u
			  LEFT JOIN tasks t ON u.id = t.owner_id
			  GROUP BY u.id, u.name, u.initials, u.avatar_class, u.role, u.team_leader
			  ORDER BY u.name`

	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []TeamMember
	for rows.Next() {
		var m TeamMember
		err := rows.Scan(
			&m.ID, &m.Name, &m.Initials, &m.AvatarClass, &m.Role, &m.TeamLeader,
			&m.TaskCount, &m.CompletedTasks,
		)
		if err != nil {
			return nil, err
		}
		members = append(members, m)
	}

	return members, nil
}

func (s *Store) GetTeamStats(ctx context.Context) (*TaskStats, error) {
	query := `SELECT 
			  COUNT(*) as total,
			  COUNT(CASE WHEN status = 'Backlog' THEN 1 END) as backlog,
			  COUNT(CASE WHEN status = 'Todo' THEN 1 END) as todo,
			  COUNT(CASE WHEN status = 'In Progress' THEN 1 END) as in_progress,
			  COUNT(CASE WHEN status = 'Done' THEN 1 END) as done,
			  COUNT(CASE WHEN priority = 'High' THEN 1 END) as high,
			  COUNT(CASE WHEN priority = 'Medium' THEN 1 END) as medium,
			  COUNT(CASE WHEN priority = 'Low' THEN 1 END) as low
			  FROM tasks`

	var stats TaskStats
	err := s.db.QueryRow(ctx, query).Scan(
		&stats.TotalTasks, &stats.Backlog, &stats.Todo, &stats.InProgress,
		&stats.Done, &stats.HighPriority, &stats.MediumPriority, &stats.LowPriority,
	)
	if err != nil {
		return nil, err
	}

	return &stats, nil
}
