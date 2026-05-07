package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"github.com/anomalyco/taskdashboard/internal/store/postgres"
)

type AuthHandler struct {
	store *postgres.Store
}

func NewAuthHandler(store *postgres.Store) *AuthHandler {
	return &AuthHandler{store: store}
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type UserResponse struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	Name        string `json:"name"`
	Initials    string `json:"initials"`
	Role        string `json:"role"`
	AvatarClass string `json:"avatar_class"`
	TeamLeader  bool   `json:"team_leader"`
}

func toUserResponse(u *postgres.User) UserResponse {
	return UserResponse{
		ID:          u.ID,
		Email:       u.Email,
		Name:        u.Name,
		Initials:    u.Initials,
		Role:        u.Role,
		AvatarClass: u.AvatarClass,
		TeamLeader:  u.TeamLeader,
	}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	user, err := h.store.GetUserByEmail(c.Request.Context(), req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	session, err := h.store.CreateSession(c.Request.Context(), user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user":       toUserResponse(user),
		"session_id": session.ID,
	})
}

func (h *AuthHandler) Me(c *gin.Context) {
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	u := user.(*postgres.User)
	c.JSON(http.StatusOK, toUserResponse(u))
}

func (h *AuthHandler) Logout(c *gin.Context) {
	sessionID := c.GetHeader("X-Session-Id")

	if err := h.store.DeleteSession(c.Request.Context(), sessionID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to logout"})
		return
	}

	c.Status(http.StatusNoContent)
}
