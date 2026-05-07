package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/anomalyco/taskdashboard/internal/store/postgres"
)

type TaskHandler struct {
	store *postgres.Store
}

func NewTaskHandler(store *postgres.Store) *TaskHandler {
	return &TaskHandler{store: store}
}

type CreateTaskRequest struct {
	Title       string   `json:"title" binding:"required"`
	Description string   `json:"description"`
	Status      string   `json:"status" binding:"required"`
	Priority    string   `json:"priority" binding:"required"`
	OwnerID     string   `json:"owner_id" binding:"required"`
	DueDate     string   `json:"due_date"`
	Labels      []string `json:"labels"`
}

type UpdateTaskRequest struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Status      string   `json:"status"`
	Priority    string   `json:"priority"`
	DueDate     string   `json:"due_date"`
	Labels      []string `json:"labels"`
}

type TaskResponse struct {
	ID            string   `json:"id"`
	Title         string   `json:"title"`
	Description   string   `json:"description"`
	Status        string   `json:"status"`
	Priority      string   `json:"priority"`
	OwnerID       string   `json:"owner_id"`
	DueDate       string   `json:"due_date,omitempty"`
	Labels        []string `json:"labels"`
	CommentsCount int      `json:"comments_count"`
	CreatedAt     string   `json:"created_at"`
	UpdatedAt     string   `json:"updated_at"`
}

func toTaskResponse(t *postgres.Task) TaskResponse {
	resp := TaskResponse{
		ID:            t.ID,
		Title:         t.Title,
		Description:   t.Description,
		Status:        t.Status,
		Priority:      t.Priority,
		OwnerID:       t.OwnerID,
		Labels:        t.Labels,
		CommentsCount: t.CommentsCount,
		CreatedAt:     t.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     t.UpdatedAt.Format(time.RFC3339),
	}

	if t.DueDate != nil {
		resp.DueDate = t.DueDate.Format("2006-01-02")
	}

	return resp
}

func (h *TaskHandler) ListTasks(c *gin.Context) {
	user, _ := c.Get("user")
	u := user.(*postgres.User)

	statusFilter := c.Query("status")

	tasks, err := h.store.ListTasks(c.Request.Context(), u.ID, u.Role, statusFilter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list tasks"})
		return
	}

	var response []TaskResponse
	for _, t := range tasks {
		response = append(response, toTaskResponse(&t))
	}

	c.JSON(http.StatusOK, response)
}

func (h *TaskHandler) GetTask(c *gin.Context) {
	taskID := c.Param("id")

	user, _ := c.Get("user")
	u := user.(*postgres.User)

	task, err := h.store.GetTask(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	if u.Role != "manager" && task.OwnerID != u.ID {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	c.JSON(http.StatusOK, toTaskResponse(task))
}

func (h *TaskHandler) CreateTask(c *gin.Context) {
	var req CreateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	task := &postgres.Task{
		ID:          uuid.New().String(),
		Title:       req.Title,
		Description: req.Description,
		Status:      req.Status,
		Priority:    req.Priority,
		OwnerID:     req.OwnerID,
		Labels:      req.Labels,
	}

	if req.DueDate != "" {
		t, err := time.Parse("2006-01-02", req.DueDate)
		if err == nil {
			task.DueDate = &t
		}
	}

	if err := h.store.CreateTask(c.Request.Context(), task); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create task"})
		return
	}

	c.JSON(http.StatusCreated, toTaskResponse(task))
}

func (h *TaskHandler) UpdateTask(c *gin.Context) {
	taskID := c.Param("id")

	user, _ := c.Get("user")
	u := user.(*postgres.User)

	_, err := h.store.GetTask(c.Request.Context(), taskID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "task not found"})
		return
	}

	if u.Role != "manager" {
		c.JSON(http.StatusForbidden, gin.H{"error": "manager access required"})
		return
	}

	var req UpdateTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	updates := make(map[string]interface{})
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.Priority != "" {
		updates["priority"] = req.Priority
	}
	if req.DueDate != "" {
		t, err := time.Parse("2006-01-02", req.DueDate)
		if err == nil {
			updates["due_date"] = t
		}
	}
	if req.Labels != nil {
		updates["labels"] = req.Labels
	}

	if err := h.store.UpdateTask(c.Request.Context(), taskID, updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update task"})
		return
	}

	updatedTask, _ := h.store.GetTask(c.Request.Context(), taskID)
	c.JSON(http.StatusOK, toTaskResponse(updatedTask))
}
