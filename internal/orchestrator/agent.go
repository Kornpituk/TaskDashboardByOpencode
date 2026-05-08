package orchestrator

import "context"

type AgentStatus string

const (
	StatusIdle    AgentStatus = "idle"
	StatusWorking AgentStatus = "working"
	StatusDone    AgentStatus = "done"
	StatusError   AgentStatus = "error"
)

type RunStatus string

const (
	RunStatusPending   RunStatus = "pending"
	RunStatusRunning   RunStatus = "running"
	RunStatusSuccess   RunStatus = "success"
	RunStatusFailed    RunStatus = "failed"
	RunStatusSkipped   RunStatus = "skipped"
	RunStatusCancelled RunStatus = "cancelled"
)

type Agent interface {
	ID() string
	Name() string
	Description() string
	Execute(ctx context.Context, input map[string]interface{}) (map[string]interface{}, error)
}

type Registry struct {
	agents map[string]Agent
}

func NewRegistry() *Registry {
	return &Registry{agents: make(map[string]Agent)}
}

func (r *Registry) Register(agent Agent) {
	r.agents[agent.ID()] = agent
}

func (r *Registry) Get(id string) (Agent, bool) {
	a, ok := r.agents[id]
	return a, ok
}

func (r *Registry) List() []Agent {
	list := make([]Agent, 0, len(r.agents))
	for _, a := range r.agents {
		list = append(list, a)
	}
	return list
}
