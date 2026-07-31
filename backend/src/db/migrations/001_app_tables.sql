CREATE TABLE IF NOT EXISTS app_schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'REVIEWER',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_history (
  id BIGSERIAL PRIMARY KEY,
  incapacidad_id BIGINT NOT NULL REFERENCES incapacidades(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL CHECK (action IN ('APROBADA', 'DENEGADA')),
  observation TEXT,
  reviewer_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_history_incapacidad
  ON approval_history (incapacidad_id, created_at DESC);
