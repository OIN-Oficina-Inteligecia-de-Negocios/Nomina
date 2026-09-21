-- 004_fix_usuarios_nomina_columns.sql
-- Asegurar que las columnas requeridas por bootstrap.ts existan en usuarios_nomina

ALTER TABLE public.usuarios_nomina
  ADD COLUMN IF NOT EXISTS zona_asignada VARCHAR(120);

ALTER TABLE public.usuarios_nomina
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE;
