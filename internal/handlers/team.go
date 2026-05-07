package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/anomalyco/taskdashboard/internal/store/postgres"
)

type TeamHandler struct {
	store *postgres.Store
}

func NewTeamHandler(store *postgres.Store) *TeamHandler {
	return &TeamHandler{store: store}
}

type TeamMemberResponse struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Initials       string `json:"initials"`
	AvatarClass    string `json:"avatar_class"`
	Role           string `json:"role"`
	TeamLeader     bool   `json:"team_leader"`
	TaskCount      int    `json:"task_count"`
	CompletedTasks int    `json:"completed_tasks"`
}

type TeamStatsResponse struct {
	TotalTasks     int `json:"total_tasks"`
	Backlog        int `json:"backlog"`
	Todo           int `json:"todo"`
	InProgress     int `json:"in_progress"`
	Done           int `json:"done"`
	HighPriority   int `json:"high_priority"`
	MediumPriority int `json:"medium_priority"`
	LowPriority    int `json:"low_priority"`
}

func toTeamMemberResponse(m *postgres.TeamMember) TeamMemberResponse {
	return TeamMemberResponse{
		ID:             m.ID,
		Name:           m.Name,
		Initials:       m.Initials,
		AvatarClass:    m.AvatarClass,
		Role:           m.Role,
		TeamLeader:     m.TeamLeader,
		TaskCount:      m.TaskCount,
		CompletedTasks: m.CompletedTasks,
	}
}

func toTeamStatsResponse(s *postgres.TaskStats) TeamStatsResponse {
	return TeamStatsResponse{
		TotalTasks:     s.TotalTasks,
		Backlog:        s.Backlog,
		Todo:           s.Todo,
		InProgress:     s.InProgress,
		Done:           s.Done,
		HighPriority:   s.HighPriority,
		MediumPriority: s.MediumPriority,
		LowPriority:    s.LowPriority,
	}
}

func (h *TeamHandler) ListTeam(c *gin.Context) {
	members, err := h.store.ListTeamMembers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list team members"})
		return
	}

	var response []TeamMemberResponse
	for _, m := range members {
		response = append(response, toTeamMemberResponse(&m))
	}

	c.JSON(http.StatusOK, response)
}

func (h *TeamHandler) GetStats(c *gin.Context) {
	stats, err := h.store.GetTeamStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get team stats"})
		return
	}

	c.JSON(http.StatusOK, toTeamStatsResponse(stats))
}
