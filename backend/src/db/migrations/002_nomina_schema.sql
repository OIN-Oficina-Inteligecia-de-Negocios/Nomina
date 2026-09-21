CREATE SCHEMA IF NOT EXISTS "Nomina";

-- Usamos el esquema Nomina para las siguientes tablas
SET search_path TO "Nomina", public;

CREATE TABLE IF NOT EXISTS Usuarios_Nomina (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'REVIEWER',
  zona_asignada VARCHAR(120),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS empleados (
  chat_id BIGINT PRIMARY KEY,
  cedula VARCHAR(30) NOT NULL UNIQUE,
  nombre_completo VARCHAR(180) NOT NULL,
  eps VARCHAR(120),
  eps_nombre VARCHAR(120),
  jefe_inmediato VARCHAR(180),
  zona_area VARCHAR(120),
  zona_spt VARCHAR(120),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incapacidades (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT NOT NULL REFERENCES empleados(chat_id),
  tipo VARCHAR(40) NOT NULL,
  pk_tipo INTEGER,
  datos JSONB NOT NULL DEFAULT '{}'::jsonb,
  estado_tramite VARCHAR(40) NOT NULL DEFAULT 'PENDIENTE_DOC',
  url_documento TEXT,
  nombre_archivo TEXT,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS incapacidades_estado_idx ON incapacidades (estado_tramite);
CREATE INDEX IF NOT EXISTS incapacidades_chat_idx ON incapacidades (chat_id);
CREATE INDEX IF NOT EXISTS incapacidades_fecha_idx ON incapacidades (fecha_creacion DESC);

CREATE TABLE IF NOT EXISTS approval_history (
  id BIGSERIAL PRIMARY KEY,
  incapacidad_id BIGINT NOT NULL REFERENCES incapacidades(id) ON DELETE CASCADE,
  action VARCHAR(30) NOT NULL CHECK (action IN ('APROBADA', 'DENEGADA')),
  observation TEXT,
  reviewer_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_history_incapacidad ON approval_history (incapacidad_id, created_at DESC);

CREATE OR REPLACE VIEW perfil_empleado AS
SELECT
  chat_id,
  cedula,
  nombre_completo,
  eps,
  eps_nombre,
  jefe_inmediato,
  zona_area,
  zona_spt
FROM empleados;
