package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/anomalyco/taskdashboard/internal/orchestrator"
)

type OrchestratorHandler struct {
	store    orchestrator.Store
	engine   *orchestrator.WorkflowEngine
	runner   *orchestrator.JobRunner
	hub      *orchestrator.Hub
	registry *orchestrator.Registry
}

func NewOrchestratorHandler(store orchestrator.Store, engine *orchestrator.WorkflowEngine, runner *orchestrator.JobRunner, hub *orchestrator.Hub, registry *orchestrator.Registry) *OrchestratorHandler {
	return &OrchestratorHandler{
		store:    store,
		engine:   engine,
		runner:   runner,
		hub:      hub,
		registry: registry,
	}
}

// GetAgentStates returns all agent states for the dashboard
func (h *OrchestratorHandler) GetAgentStates(c *gin.Context) {
	states, err := h.store.GetAllAgentStates(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, states)
}

// UpdateAgentState updates the state of a specific agent
func (h *OrchestratorHandler) UpdateAgentState(c *gin.Context) {
	agentID := c.Param("id")
	if agentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "agent_id is required"})
		return
	}

	var req struct {
		Status     string `json:"status"`
		LastAction string `json:"last_action"`
		Phase      string `json:"phase"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	status := orchestrator.AgentStatus(req.Status)
	if status == "" {
		status = orchestrator.StatusIdle
	}

	err := h.store.UpdateAgentState(c.Request.Context(), agentID, req.Phase, status, req.LastAction)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}

// GetWorkflowStatus returns the current workflow status
func (h *OrchestratorHandler) GetWorkflowStatus(c *gin.Context) {
	status, err := h.store.GetWorkflowStatus(c.Request.Context())
	if err != nil {
		log.Printf("Error in GetWorkflowStatus: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, status)
}

// InitializeAgent initializes an agent in the state table
func (h *OrchestratorHandler) InitializeAgent(c *gin.Context) {
	var req struct {
		AgentID string `json:"agent_id"`
		Phase   string `json:"phase"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.store.InitializeAgent(c.Request.Context(), req.AgentID, req.Phase)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusCreated)
}

// StartWorkflow starts a new workflow run
func (h *OrchestratorHandler) StartWorkflow(c *gin.Context) {
	workflowID := uuid.New().String()
	ctx := c.Request.Context()

	for _, phase := range h.engine.Phases() {
		runID := uuid.New().String()
		input := phase.Config
		if input == nil {
			input = map[string]interface{}{}
		}

		if err := h.store.CreateRun(ctx, runID, workflowID, phase.AgentID, phase.ID, input); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if err := h.store.InitializeAgent(ctx, phase.AgentID, phase.ID); err != nil {
			log.Printf("Warning: failed to initialize agent %s: %v", phase.AgentID, err)
		}
	}

	ready, err := h.engine.Evaluate(ctx, workflowID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	for _, phase := range ready {
		runs, err := h.store.ListRuns(ctx, workflowID)
		if err != nil {
			continue
		}
		for _, run := range runs {
			if run.PhaseID == phase.ID && run.Status == orchestrator.RunStatusPending {
				h.runner.Submit(orchestrator.Job{
					RunID:      run.RunID,
					WorkflowID: workflowID,
					PhaseID:    phase.ID,
					AgentID:    phase.AgentID,
					Input:      run.Input,
				})
				break
			}
		}
	}

	hubMsg := orchestrator.NewWSMessage("workflow:start", map[string]interface{}{
		"workflow_id": workflowID,
		"timestamp":   time.Now(),
	})
	if hubMsg != nil {
		h.hub.Broadcast(hubMsg)
	}

	c.JSON(http.StatusOK, gin.H{
		"workflow_id": workflowID,
		"phases":      len(h.engine.Phases()),
		"started":     len(ready),
	})
}

// ListRuns returns all runs, optionally filtered by workflow_id
func (h *OrchestratorHandler) ListRuns(c *gin.Context) {
	workflowID := c.Query("workflow_id")

	runs, err := h.store.ListRuns(c.Request.Context(), workflowID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, runs)
}

// GetRun returns run details and logs
func (h *OrchestratorHandler) GetRun(c *gin.Context) {
	runID := c.Param("id")
	if runID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "run id is required"})
		return
	}

	run, err := h.store.GetRun(c.Request.Context(), runID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "run not found"})
		return
	}

	logs, err := h.store.GetLogs(c.Request.Context(), runID)
	if err != nil {
		logs = []orchestrator.AgentLog{}
	}

	c.JSON(http.StatusOK, gin.H{
		"run":  run,
		"logs": logs,
	})
}

// ExecuteAgent executes a specific agent now
func (h *OrchestratorHandler) ExecuteAgent(c *gin.Context) {
	agentID := c.Param("id")
	if agentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "agent id is required"})
		return
	}

	_, ok := h.registry.Get(agentID)
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "agent not found"})
		return
	}

	var req struct {
		Input map[string]interface{} `json:"input"`
	}
	if err := c.ShouldBindJSON(&req); err == nil && req.Input == nil {
		req.Input = map[string]interface{}{}
	}

	runID := uuid.New().String()
	workflowID := c.Query("workflow_id")
	if workflowID == "" {
		workflowID = "manual-" + uuid.New().String()
	}

	err := h.store.CreateRun(c.Request.Context(), runID, workflowID, agentID, "", req.Input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	h.runner.Submit(orchestrator.Job{
		RunID:      runID,
		WorkflowID: workflowID,
		PhaseID:    "",
		AgentID:    agentID,
		Input:      req.Input,
	})

	c.JSON(http.StatusOK, gin.H{
		"run_id":      runID,
		"workflow_id": workflowID,
		"agent_id":    agentID,
		"status":      "submitted",
	})
}

// HandleWebSocket handles WebSocket upgrade
func (h *OrchestratorHandler) HandleWebSocket(c *gin.Context) {
	h.hub.HandleWebSocket(c.Writer, c.Request)
}
