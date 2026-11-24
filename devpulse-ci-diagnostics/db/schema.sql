CREATE TABLE IF NOT EXISTS ci_runs (
  id TEXT PRIMARY KEY,
  service TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('passed','failed')),
  duration_ms INTEGER NOT NULL CHECK(duration_ms >= 0),
  log TEXT NOT NULL,
  failure_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ci_runs_service_time_idx ON ci_runs (service, created_at DESC);
CREATE INDEX IF NOT EXISTS ci_runs_failure_idx ON ci_runs (failure_type) WHERE status='failed';
CREATE VIEW ci_service_health AS SELECT service,COUNT(*) AS total_runs,
  COUNT(*) FILTER (WHERE status='failed') AS failures,
  ROUND(AVG(duration_ms),2) AS mean_duration_ms FROM ci_runs GROUP BY service;
