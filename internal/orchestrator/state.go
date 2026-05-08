package orchestrator

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type AgentState struct {
	AgentID    string       `json:"agent_id"`
	CurrentPhase string     `json:"current_phase"`
	Status      AgentStatus `json:"status"`
	LastAction  string      `json:"last_action"`
	ErrorCount  int         `json:"error_count"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type Store interface {
	UpdateAgentState(ctx context.Context, agentID, phase string, status AgentStatus, lastAction string) error
	GetAgentState(ctx context.Context, agentID string) (*AgentState, error)
	GetAllAgentStates(ctx context.Context) ([]*AgentState, error)
	GetWorkflowStatus(ctx context.Context) (map[string]interface{}, error)
	InitializeAgent(ctx context.Context, agentID, phase string) error
	CreateRun(ctx context.Context, runID, workflowID, agentID, phaseID string, input map[string]interface{}) error
	UpdateRunStatus(ctx context.Context, runID string, status RunStatus, output map[string]interface{}, errMsg string) error
	GetRun(ctx context.Context, runID string) (*AgentRun, error)
	ListRuns(ctx context.Context, workflowID string) ([]AgentRun, error)
	AddLog(ctx context.Context, runID, level, message string, metadata map[string]interface{}) error
	GetLogs(ctx context.Context, runID string) ([]AgentLog, error)
}

type pgxStore struct {
	db *pgxpool.Pool
}

func NewStore(db *pgxpool.Pool) Store {
	return &pgxStore{db: db}
}

func (s *pgxStore) UpdateAgentState(ctx context.Context, agentID, phase string, status AgentStatus, lastAction string) error {
	query := `
		INSERT INTO agent_state (agent_id, current_phase, status, last_action, updated_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (agent_id) DO UPDATE SET
			current_phase = EXCLUDED.current_phase,
			status = EXCLUDED.status,
			last_action = EXCLUDED.last_action,
			error_count = CASE WHEN EXCLUDED.status = 'error' THEN agent_state.error_count + 1 ELSE agent_state.error_count END,
			updated_at = EXCLUDED.updated_at
	`
	_, err := s.db.Exec(ctx, query, agentID, phase, status, lastAction)
	return err
}

func (s *pgxStore) GetAgentState(ctx context.Context, agentID string) (*AgentState, error) {
	query := `
		SELECT agent_id, current_phase, status, last_action, error_count, updated_at
		FROM agent_state WHERE agent_id = $1
	`
	state := &AgentState{}
	err := s.db.QueryRow(ctx, query, agentID).Scan(
		&state.AgentID, &state.CurrentPhase, &state.Status, &state.LastAction,
		&state.ErrorCount, &state.UpdatedAt,
	)
	if err != nil {
		return nil, nil
	}
	return state, nil
}

func (s *pgxStore) GetAllAgentStates(ctx context.Context) ([]*AgentState, error) {
	query := `
		SELECT agent_id, current_phase, status, last_action, error_count, updated_at
		FROM agent_state ORDER BY updated_at DESC
	`
	rows, err := s.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var states []*AgentState
	for rows.Next() {
		state := &AgentState{}
		if err := rows.Scan(&state.AgentID, &state.CurrentPhase, &state.Status, &state.LastAction, &state.ErrorCount, &state.UpdatedAt); err != nil {
			return nil, err
		}
		states = append(states, state)
	}
	return states, rows.Err()
}

func (s *pgxStore) GetWorkflowStatus(ctx context.Context) (map[string]interface{}, error) {
	states, err := s.GetAllAgentStates(ctx)
	if err != nil {
		return nil, err
	}

	phases := []string{"phase-1", "phase-2", "phase-3", "phase-4", "phase-5", "phase-6", "phase-7", "phase-8", "phase-9"}
	phaseNames := map[string]string{
		"phase-1": "Explore (Audit)",
		"phase-2": "Database Setup",
		"phase-3": "Backend API",
		"phase-4": "Frontend Core",
		"phase-5": "Frontend UI Components",
		"phase-6": "Orchestrator",
		"phase-7": "Agent Dashboard",
		"phase-8": "Test Agent",
		"phase-9": "Reviewer Agent",
	}

	result := map[string]interface{}{
		"phases":     phases,
		"phase_names": phaseNames,
		"agents":     states,
		"next_phase": getNextPhase(states, phases),
	}

	return result, nil
}

func getNextPhase(states []*AgentState, phases []string) string {
	stateMap := make(map[string]*AgentState)
	for _, s := range states {
		stateMap[s.CurrentPhase] = s
	}

	for _, phase := range phases {
		if state, ok := stateMap[phase]; !ok || state.Status != StatusDone {
			return phase
		}
	}
	return "all-done"
}

func (s *pgxStore) InitializeAgent(ctx context.Context, agentID, phase string) error {
	query := `
		INSERT INTO agent_state (agent_id, current_phase, status, last_action, updated_at)
		VALUES ($1, $2, 'idle', 'Initialized', NOW())
		ON CONFLICT (agent_id) DO NOTHING
	`
	_, err := s.db.Exec(ctx, query, agentID, phase)
	return err
}
