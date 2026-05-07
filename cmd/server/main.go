package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/anomalyco/taskdashboard/internal/handlers"
	"github.com/anomalyco/taskdashboard/internal/middleware"
	"github.com/anomalyco/taskdashboard/internal/store/postgres"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	ctx := context.Background()
	store, err := postgres.NewStore(ctx, databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer store.Close()

	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	r.Use(corsMiddleware())

	api := r.Group("/api")

	authHandler := handlers.NewAuthHandler(store)
	api.POST("/auth/login", authHandler.Login)
	api.GET("/auth/me", middleware.SessionAuth(store), authHandler.Me)
	api.POST("/auth/logout", middleware.SessionAuth(store), authHandler.Logout)

	taskHandler := handlers.NewTaskHandler(store)
	tasks := api.Group("/tasks", middleware.SessionAuth(store))
	{
		tasks.GET("", taskHandler.ListTasks)
		tasks.GET("/:id", taskHandler.GetTask)
		tasks.POST("", middleware.RequireManager(), taskHandler.CreateTask)
		tasks.PUT("/:id", middleware.RequireManager(), taskHandler.UpdateTask)
	}

	teamHandler := handlers.NewTeamHandler(store)
	team := api.Group("/team", middleware.SessionAuth(store), middleware.RequireManager())
	{
		team.GET("", teamHandler.ListTeam)
		team.GET("/stats", teamHandler.GetStats)
	}

	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	go func() {
		log.Println("Server starting on :8080")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("ListenAndServe error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, X-Session-Id")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
