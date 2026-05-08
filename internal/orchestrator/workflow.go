package orchestrator

import "context"

type PhaseDefinition struct {
	ID           string
	Name         string
	AgentID      string
	Dependencies []string
	Config       map[string]interface{}
}

type WorkflowDefinition struct {
	ID     string
	Name   string
	Phases []PhaseDefinition
}

type WorkflowEngine struct {
	registry *Registry
	store    Store
	artifact ArtifactStore
	workflow WorkflowDefinition
}

func NewWorkflowEngine(registry *Registry, store Store, artifact ArtifactStore) *WorkflowEngine {
	return &WorkflowEngine{
		registry: registry,
		store:    store,
		artifact: artifact,
		workflow: WorkflowDefinition{
			ID:   "default-workflow",
			Name: "Default Workflow",
			Phases: []PhaseDefinition{
				{ID: "phase-1", Name: "Explore (Audit)", AgentID: "audit-agent", Dependencies: []string{}},
				{ID: "phase-2", Name: "Database Setup", AgentID: "db-agent", Dependencies: []string{"phase-1"}},
				{ID: "phase-3", Name: "Backend API", AgentID: "api-agent", Dependencies: []string{"phase-2"}},
				{ID: "phase-4", Name: "Frontend Core", AgentID: "ui-agent", Dependencies: []string{"phase-3"}},
				{ID: "phase-5", Name: "Frontend UI Components", AgentID: "component-agent", Dependencies: []string{"phase-4"}},
				{ID: "phase-6", Name: "Orchestrator", AgentID: "orch-agent", Dependencies: []string{"phase-5"}},
			},
		},
	}
}

func (e *WorkflowEngine) Evaluate(ctx context.Context, workflowID string) ([]PhaseDefinition, error) {
	states, err := e.store.GetAllAgentStates(ctx)
	if err != nil {
		return nil, err
	}

	stateMap := make(map[string]*AgentState)
	for _, s := range states {
		stateMap[s.CurrentPhase] = s
	}

	var ready []PhaseDefinition
	for _, phase := range e.workflow.Phases {
		if state, ok := stateMap[phase.ID]; ok && state.Status == StatusDone {
			continue
		}

		depsMet := true
		for _, dep := range phase.Dependencies {
			if state, ok := stateMap[dep]; !ok || state.Status != StatusDone {
				depsMet = false
				break
			}
		}

		if depsMet {
			ready = append(ready, phase)
		}
	}

	return ready, nil
}

func (e *WorkflowEngine) Phases() []PhaseDefinition {
	return e.workflow.Phases
}

func (e *WorkflowEngine) GetNextPhase(ctx context.Context, workflowID string) (*PhaseDefinition, error) {
	phases, err := e.Evaluate(ctx, workflowID)
	if err != nil {
		return nil, err
	}
	if len(phases) == 0 {
		return nil, nil
	}
	return &phases[0], nil
}
