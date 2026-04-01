package export

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"dfw-dragevents/tools/internal/db"
)

type ExportPaths struct {
	DataDir string // e.g. ../site/data
}

func EnsureDir(dir string) error {
	return os.MkdirAll(dir, 0o755)
}

func WriteJSON(path string, v any) error {
	b, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, append(b, '\n'), 0o644)
}

func All(dataDir string, tracks []db.Track, events []db.Event) error {
	if err := EnsureDir(dataDir); err != nil {
		return err
	}
	if err := WriteJSON(filepath.Join(dataDir, "tracks.json"), tracks); err != nil {
		return fmt.Errorf("tracks.json: %w", err)
	}
	if err := WriteJSON(filepath.Join(dataDir, "events.json"), events); err != nil {
		return fmt.Errorf("events.json: %w", err)
	}
	return nil
}
