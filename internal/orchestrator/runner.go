package orchestrator

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"
)

type Job struct {
	RunID      string
	WorkflowID string
	PhaseID    string
	AgentID    string
	Input      map[string]interface{}
}

type JobRunner struct {
	registry *Registry
	store    Store
	artifact ArtifactStore
	engine   *WorkflowEngine
	hub      *Hub
	jobs     chan Job
	workers  int
	ctx      context.Context
	cancel   context.CancelFunc
	wg       sync.WaitGroup
}

func NewJobRunner(registry *Registry, store Store, artifact ArtifactStore, engine *WorkflowEngine, hub *Hub, numWorkers int) *JobRunner {
	ctx, cancel := context.WithCancel(context.Background())
	return &JobRunner{
		registry: registry,
		store:    store,
		artifact: artifact,
		engine:   engine,
		hub:      hub,
		jobs:     make(chan Job, 100),
		workers:  numWorkers,
		ctx:      ctx,
		cancel:   cancel,
	}
}

func (r *JobRunner) Start() {
	for i := 0; i < r.workers; i++ {
		r.wg.Add(1)
		go r.worker()
	}
	log.Printf("JobRunner started with %d workers", r.workers)
}

func (r *JobRunner) Stop() {
	r.cancel()
	close(r.jobs)
	r.wg.Wait()
	log.Println("JobRunner stopped")
}

func (r *JobRunner) worker() {
	defer r.wg.Done()
	for {
		select {
		case job, ok := <-r.jobs:
			if !ok {
				return
			}
			r.executeJob(job)
		case <-r.ctx.Done():
			return
		}
	}
}

func (r *JobRunner) Submit(job Job) {
	select {
	case r.jobs <- job:
	default:
		log.Printf("Job queue full, dropping job for agent %s", job.AgentID)
	}
}

func (r *JobRunner) executeJob(job Job) {
	r.store.UpdateAgentState(r.ctx, job.AgentID, job.PhaseID, StatusWorking, "Executing agent task")
	r.store.UpdateRunStatus(r.ctx, job.RunID, RunStatusRunning, nil, "")

	r.artifact.SaveArtifact(r.ctx, job.RunID, "input", "input", job.Input)

	agent, ok := r.registry.Get(job.AgentID)
	if !ok {
		r.store.UpdateRunStatus(r.ctx, job.RunID, RunStatusFailed, nil, "agent not found")
		r.store.UpdateAgentState(r.ctx, job.AgentID, job.PhaseID, StatusError, "Agent not found in registry")
		r.store.AddLog(r.ctx, job.RunID, "error", "Agent not found in registry", nil)
		r.broadcastStatus(job, "agent:status", StatusError)
		r.broadcastStatus(job, "run:update", RunStatusFailed)
		return
	}

	r.store.AddLog(r.ctx, job.RunID, "info", fmt.Sprintf("Starting agent: %s", agent.Name()), nil)

	var result map[string]interface{}
	var err error
	maxRetries := 3

	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			backoff := time.Duration(1<<uint(attempt-1)) * time.Second
			r.store.AddLog(r.ctx, job.RunID, "warn", fmt.Sprintf("Retry attempt %d/%d after %v", attempt, maxRetries, backoff), nil)
			time.Sleep(backoff)
		}

		execCtx, cancel := context.WithTimeout(r.ctx, 5*time.Minute)
		result, err = agent.Execute(execCtx, job.Input)
		cancel()

		if err == nil {
			break
		}

		r.store.AddLog(r.ctx, job.RunID, "error", fmt.Sprintf("Attempt %d failed: %v", attempt+1, err), nil)
	}

	if err != nil {
		r.store.UpdateRunStatus(r.ctx, job.RunID, RunStatusFailed, nil, err.Error())
		r.store.UpdateAgentState(r.ctx, job.AgentID, job.PhaseID, StatusError, fmt.Sprintf("Failed after %d retries: %v", maxRetries, err))
		r.store.AddLog(r.ctx, job.RunID, "error", fmt.Sprintf("Agent execution failed after %d retries: %v", maxRetries, err), nil)
		r.broadcastStatus(job, "agent:status", StatusError)
		r.broadcastStatus(job, "run:update", RunStatusFailed)
		return
	}

	r.store.UpdateRunStatus(r.ctx, job.RunID, RunStatusSuccess, result, "")
	r.store.UpdateAgentState(r.ctx, job.AgentID, job.PhaseID, StatusDone, "Completed successfully")
	r.artifact.SaveArtifact(r.ctx, job.RunID, "output", "output", result)
	r.store.AddLog(r.ctx, job.RunID, "info", "Agent execution completed successfully", nil)
	r.broadcastStatus(job, "agent:status", StatusDone)
	r.broadcastStatus(job, "run:update", RunStatusSuccess)
}

func (r *JobRunner) broadcastStatus(job Job, msgType string, status interface{}) {
	if r.hub == nil {
		return
	}
	payload := map[string]interface{}{
		"run_id":    job.RunID,
		"agent_id":  job.AgentID,
		"phase_id":  job.PhaseID,
		"status":    status,
		"timestamp": time.Now(),
	}
	msg := WSMessage{Type: msgType, Payload: payload}
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	r.hub.Broadcast(data)
}
