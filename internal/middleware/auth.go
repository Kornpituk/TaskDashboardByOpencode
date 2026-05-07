package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/anomalyco/taskdashboard/internal/store/postgres"
)

func SessionAuth(store *postgres.Store) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionID := c.GetHeader("X-Session-Id")
		if sessionID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing session id"})
			c.Abort()
			return
		}

		sess, err := store.GetSession(c.Request.Context(), sessionID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired session"})
			c.Abort()
			return
		}

		user, err := store.GetUserByID(c.Request.Context(), sess.UserID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
			c.Abort()
			return
		}

		c.Set("session", sess)
		c.Set("user", user)
		c.Next()
	}
}

func RequireManager() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
			c.Abort()
			return
		}

		userData := user.(*postgres.User)
		if userData.Role != "manager" {
			c.JSON(http.StatusForbidden, gin.H{"error": "manager access required"})
			c.Abort()
			return
		}

		c.Next()
	}
}
