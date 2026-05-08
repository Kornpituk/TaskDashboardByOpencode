package orchestrator

import (
	"context"
	"encoding/json"
	"time"
)

type AgentRun struct {
	RunID        string                 `json:"run_id"`
	WorkflowID   string                 `json:"workflow_id"`
	AgentID      string                 `json:"agent_id"`
	PhaseID      string                 `json:"phase_id"`
	Status       RunStatus              `json:"status"`
	Input        map[string]interface{} `json:"input"`
	Output       map[string]interface{} `json:"output"`
	ErrorMessage string                 `json:"error_message,omitempty"`
	RetryCount   int                    `json:"retry_count"`
	MaxRetries   int                    `json:"max_retries"`
	StartedAt    *time.Time             `json:"started_at"`
	CompletedAt  *time.Time             `json:"completed_at"`
	CreatedAt    time.Time              `json:"created_at"`
}

type AgentLog struct {
	ID        int64                  `json:"id"`
	RunID     string                 `json:"run_id"`
	Level     string                 `json:"level"`
	Message   string                 `json:"message"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt time.Time              `json:"created_at"`
}

func (s *pgxStore) CreateRun(ctx context.Context, runID, workflowID, agentID, phaseID string, input map[string]interface{}) error {
	inputJSON, err := json.Marshal(input)
	if err != nil {
		return err
	}
	query := `
		INSERT INTO agent_runs (run_id, workflow_id, agent_id, phase_id, status, input, retry_count, max_retries, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, 0, 3, NOW())
	`
	_, err = s.db.Exec(ctx, query, runID, workflowID, agentID, phaseID, RunStatusPending, inputJSON)
	return err
}

func (s *pgxStore) UpdateRunStatus(ctx context.Context, runID string, status RunStatus, output map[string]interface{}, errMsg string) error {
	var outputJSON []byte
	var err error
	if output != nil {
		outputJSON, err = json.Marshal(output)
		if err != nil {
			return err
		}
	}
	query := `
		UPDATE agent_runs SET status = $2, output = $3, error_message = $4, completed_at = NOW()
		WHERE run_id = $1
	`
	_, err = s.db.Exec(ctx, query, runID, status, outputJSON, errMsg)
	return err
}

func (s *pgxStore) GetRun(ctx context.Context, runID string) (*AgentRun, error) {
	query := `SELECT run_id, workflow_id, agent_id, phase_id, status, input, output, COALESCE(error_message, ''), retry_count, max_retries, started_at, completed_at, created_at FROM agent_runs WHERE run_id = $1`
	run := &AgentRun{}
	var inputJSON, outputJSON []byte
	err := s.db.QueryRow(ctx, query, runID).Scan(
		&run.RunID, &run.WorkflowID, &run.AgentID, &run.PhaseID, &run.Status,
		&inputJSON, &outputJSON, &run.ErrorMessage, &run.RetryCount, &run.MaxRetries,
		&run.StartedAt, &run.CompletedAt, &run.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	if inputJSON != nil {
		json.Unmarshal(inputJSON, &run.Input)
	}
	if outputJSON != nil {
		json.Unmarshal(outputJSON, &run.Output)
	}
	return run, nil
}

func (s *pgxStore) ListRuns(ctx context.Context, workflowID string) ([]AgentRun, error) {
	var query string
	var args []interface{}
	if workflowID == "" {
		query = `SELECT run_id, workflow_id, agent_id, phase_id, status, input, output, COALESCE(error_message, ''), retry_count, max_retries, started_at, completed_at, created_at FROM agent_runs ORDER BY created_at DESC`
	} else {
		query = `SELECT run_id, workflow_id, agent_id, phase_id, status, input, output, COALESCE(error_message, ''), retry_count, max_retries, started_at, completed_at, created_at FROM agent_runs WHERE workflow_id = $1 ORDER BY created_at DESC`
		args = []interface{}{workflowID}
	}
	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var runs []AgentRun
	for rows.Next() {
		var run AgentRun
		var inputJSON, outputJSON []byte
		if err := rows.Scan(
			&run.RunID, &run.WorkflowID, &run.AgentID, &run.PhaseID, &run.Status,
			&inputJSON, &outputJSON, &run.ErrorMessage, &run.RetryCount, &run.MaxRetries,
			&run.StartedAt, &run.CompletedAt, &run.CreatedAt,
		); err != nil {
			return nil, err
		}
		if inputJSON != nil {
			json.Unmarshal(inputJSON, &run.Input)
		}
		if outputJSON != nil {
			json.Unmarshal(outputJSON, &run.Output)
		}
		runs = append(runs, run)
	}
	return runs, rows.Err()
}

func (s *pgxStore) AddLog(ctx context.Context, runID, level, message string, metadata map[string]interface{}) error {
	var metadataJSON []byte
	var err error
	if metadata != nil {
		metadataJSON, err = json.Marshal(metadata)
		if err != nil {
			return err
		}
	}
	query := `INSERT INTO agent_logs (run_id, level, message, metadata, created_at) VALUES ($1, $2, $3, $4, NOW())`
	_, err = s.db.Exec(ctx, query, runID, level, message, metadataJSON)
	return err
}

func (s *pgxStore) GetLogs(ctx context.Context, runID string) ([]AgentLog, error) {
	query := `SELECT id, run_id, level, message, metadata, created_at FROM agent_logs WHERE run_id = $1 ORDER BY created_at`
	rows, err := s.db.Query(ctx, query, runID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []AgentLog
	for rows.Next() {
		var log AgentLog
		var metadataJSON []byte
		if err := rows.Scan(&log.ID, &log.RunID, &log.Level, &log.Message, &metadataJSON, &log.CreatedAt); err != nil {
			return nil, err
		}
		if metadataJSON != nil {
			json.Unmarshal(metadataJSON, &log.Metadata)
		}
		logs = append(logs, log)
	}
	return logs, rows.Err()
}
