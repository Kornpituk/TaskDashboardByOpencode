package orchestrator

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ArtifactStore interface {
	SaveArtifact(ctx context.Context, runID, name, artifactType string, data map[string]interface{}) error
	GetArtifacts(ctx context.Context, runID string) ([]Artifact, error)
	GetRunInput(ctx context.Context, runID string) (map[string]interface{}, error)
	GetRunOutput(ctx context.Context, runID string) (map[string]interface{}, error)
}

type Artifact struct {
	ID        string                 `json:"id"`
	RunID     string                 `json:"run_id"`
	Name      string                 `json:"name"`
	Type      string                 `json:"type"`
	Data      map[string]interface{} `json:"data"`
	CreatedAt time.Time              `json:"created_at"`
}

type pgxArtifactStore struct {
	db *pgxpool.Pool
}

func NewArtifactStore(db *pgxpool.Pool) ArtifactStore {
	return &pgxArtifactStore{db: db}
}

func (s *pgxArtifactStore) SaveArtifact(ctx context.Context, runID, name, artifactType string, data map[string]interface{}) error {
	dataJSON, err := json.Marshal(data)
	if err != nil {
		return err
	}
	id := uuid.New().String()
	query := `INSERT INTO agent_artifacts (id, run_id, name, type, data, created_at) VALUES ($1, $2, $3, $4, $5, NOW())`
	_, err = s.db.Exec(ctx, query, id, runID, name, artifactType, dataJSON)
	return err
}

func (s *pgxArtifactStore) GetArtifacts(ctx context.Context, runID string) ([]Artifact, error) {
	query := `SELECT id, run_id, name, type, data, created_at FROM agent_artifacts WHERE run_id = $1 ORDER BY created_at`
	rows, err := s.db.Query(ctx, query, runID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var artifacts []Artifact
	for rows.Next() {
		var a Artifact
		var dataJSON []byte
		if err := rows.Scan(&a.ID, &a.RunID, &a.Name, &a.Type, &dataJSON, &a.CreatedAt); err != nil {
			return nil, err
		}
		if dataJSON != nil {
			json.Unmarshal(dataJSON, &a.Data)
		}
		artifacts = append(artifacts, a)
	}
	return artifacts, rows.Err()
}

func (s *pgxArtifactStore) GetRunInput(ctx context.Context, runID string) (map[string]interface{}, error) {
	query := `SELECT data FROM agent_artifacts WHERE run_id = $1 AND name = 'input' LIMIT 1`
	var dataJSON []byte
	err := s.db.QueryRow(ctx, query, runID).Scan(&dataJSON)
	if err != nil {
		return nil, err
	}
	var data map[string]interface{}
	if err := json.Unmarshal(dataJSON, &data); err != nil {
		return nil, err
	}
	return data, nil
}

func (s *pgxArtifactStore) GetRunOutput(ctx context.Context, runID string) (map[string]interface{}, error) {
	query := `SELECT data FROM agent_artifacts WHERE run_id = $1 AND name = 'output' LIMIT 1`
	var dataJSON []byte
	err := s.db.QueryRow(ctx, query, runID).Scan(&dataJSON)
	if err != nil {
		return nil, err
	}
	var data map[string]interface{}
	if err := json.Unmarshal(dataJSON, &data); err != nil {
		return nil, err
	}
	return data, nil
}
