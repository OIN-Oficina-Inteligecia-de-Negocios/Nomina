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

CREATE INDEX IF NOT EXISTS incapacidades_estado_idx
  ON incapacidades (estado_tramite);
CREATE INDEX IF NOT EXISTS incapacidades_chat_idx
  ON incapacidades (chat_id);
CREATE INDEX IF NOT EXISTS incapacidades_fecha_idx
  ON incapacidades (fecha_creacion DESC);

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

