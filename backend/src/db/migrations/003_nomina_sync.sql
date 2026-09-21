-- 003_rollback_and_use_public.sql
-- SOLUCIÓN DEFINITIVA: Desvincular solo las vistas y no eliminar las tablas físicas en public

-- 1. Eliminar vistas dependientes para evitar errores de alteración de tablas base
DROP VIEW IF EXISTS public.perfil_empleado CASCADE;

-- 2. Asegurar tabla Usuarios_Nomina en public para la administración de usuarios
CREATE TABLE IF NOT EXISTS public.Usuarios_Nomina (
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

-- Si Usuarios_Nomina está vacía, poblarla con el admin original si existía en app_users
INSERT INTO public.Usuarios_Nomina (email, password_hash, display_name, role, active, must_change_password)
SELECT u.email, u.password_hash, u.display_name, u.role, u.active, TRUE
FROM public.app_users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.Usuarios_Nomina WHERE LOWER(public.Usuarios_Nomina.email) = LOWER(u.email)
);

-- 3. Asegurar campos extras en public.empleados
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS eps_nombre VARCHAR(120);
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS zona_spt VARCHAR(120);
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMPTZ DEFAULT NOW();

-- 4. Asegurar campos extras en public.incapacidades
ALTER TABLE public.incapacidades ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMPTZ DEFAULT NOW();

-- 5. Asegurar tablas adicionales del bot en public
CREATE TABLE IF NOT EXISTS public.estados_sesion (
  chat_id         BIGINT       PRIMARY KEY,
  estado          VARCHAR(200) NOT NULL DEFAULT '',
  last_message_id VARCHAR(200),
  inc_id          BIGINT,
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.empleados_historial (
  id              BIGSERIAL    PRIMARY KEY,
  chat_id         BIGINT,
  cedula          VARCHAR(30),
  nombre_completo VARCHAR(180),
  eps             VARCHAR(120),
  eps_nombre      VARCHAR(120),
  jefe_inmediato  VARCHAR(180),
  zona_area       VARCHAR(120),
  zona_spt        VARCHAR(120),
  fecha_creacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estados_sesion_updated ON public.estados_sesion (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_historial_chat ON public.empleados_historial (chat_id);

-- 6. Volver a crear la vista perfil_empleado en public
CREATE OR REPLACE VIEW public.perfil_empleado AS
SELECT
  chat_id,
  cedula,
  nombre_completo,
  eps,
  eps_nombre,
  jefe_inmediato,
  zona_area,
  zona_spt
FROM public.empleados;

-- 7. Eliminar el esquema Nomina ya obsoleto
DROP SCHEMA IF EXISTS "Nomina" CASCADE;
