-- 005_zones_and_users.sql
-- Asegurar que la tabla zonas exista con la columna pk_zona y spt
CREATE TABLE IF NOT EXISTS public.zonas (
  pk_zona SERIAL PRIMARY KEY,
  spt VARCHAR(120) NOT NULL
);

-- Insertar las zonas utilizando WHERE NOT EXISTS
INSERT INTO public.zonas (pk_zona, spt)
SELECT 
  (SELECT COALESCE(MAX(pk_zona), 0) FROM public.zonas) + ROW_NUMBER() OVER (), 
  z.spt 
FROM (VALUES
  ('OCCIDENTE OF'),
  ('OCCIDENTE VD'),
  ('ORIENTE OF'),
  ('ORIENTE VD'),
  ('SUR OCCIDENTE OF'),
  ('SUR OCCIDENTE VD'),
  ('NORTE OF'),
  ('NORTE VD'),
  ('SUR OF - VD'),
  ('SOACHA OF - VD'),
  ('GIRARDOT'),
  ('FUSAGASUGA'),
  ('FACATATIVA'),
  ('VILLETA'),
  ('ZIPAQUIRA - ORIENTE'),
  ('CAJEROS'),
  ('ARRECIFE')
) AS z(spt)
WHERE NOT EXISTS (
  SELECT 1 FROM public.zonas WHERE public.zonas.spt = z.spt
);

-- Insertar usuarios revisores de zonas (@gelsa.com.co) con rol REVIEWER y clave genérica 'Nomina2026*'
INSERT INTO public.Usuarios_Nomina (email, password_hash, display_name, role, zona_asignada, active, must_change_password)
SELECT u.email, u.password_hash, u.display_name, u.role, u.zona_asignada, u.active, u.must_change_password
FROM (VALUES
  ('occidente.of@gelsa.com.co', '$2a$12$067l4x57B8Mvhb7nJ/GqXudmAK3gR3eYf9bH0XvD9h22K6A7U5O3G', 'Revisor OCCIDENTE OF', 'REVIEWER', 'OCCIDENTE OF', TRUE, TRUE),
  ('occidente.vd@gelsa.com.co', '$2a$12$067l4x57B8Mvhb7nJ/GqXudmAK3gR3eYf9bH0XvD9h22K6A7U5O3G', 'Revisor OCCIDENTE VD', 'REVIEWER', 'OCCIDENTE VD', TRUE, TRUE),
  ('oriente.of@gelsa.com.co', '$2a$12$067l4x57B8Mvhb7nJ/GqXudmAK3gR3eYf9bH0XvD9h22K6A7U5O3G', 'Revisor ORIENTE OF', 'REVIEWER', 'ORIENTE OF', TRUE, TRUE),
  ('oriente.vd@gelsa.com.co', '$2a$12$067l4x57B8Mvhb7nJ/GqXudmAK3gR3eYf9bH0XvD9h22K6A7U5O3G', 'Revisor ORIENTE VD', 'REVIEWER', 'ORIENTE VD', TRUE, TRUE),
  ('sur.occidente.of@gelsa.com.co', '$2a$12$067l4x57B8Mvhb7nJ/GqXudmAK3gR3eYf9bH0XvD9h22K6A7U5O3G', 'Revisor SUR OCCIDENTE OF', 'REVIEWER', 'SUR OCCIDENTE OF', TRUE, TRUE),
  ('sur.occidente.vd@gelsa.com.co', '$2a$12$067l4x57B8Mvhb7nJ/GqXudmAK3gR3eYf9bH0XvD9h22K6A7U5O3G', 'Revisor SUR OCCIDENTE VD', 'REVIEWER', 'SUR OCCIDENTE VD', TRUE, TRUE),
  ('norte.of@gelsa.com.co', '$2a$12$067l4x57B8Mvhb7nJ/GqXudmAK3gR3eYf9bH0XvD9h22K6A7U5O3G', 'Revisor NORTE OF', 'REVIEWER', 'NORTE OF', TRUE, TRUE),
  ('norte.vd@gelsa.com.co', '$2a$12$067l4x57B8Mvhb7nJ/GqXudmAK3gR3eYf9bH0XvD9h22K6A7U5O3G', 'Revisor NORTE VD', 'REVIEWER', 'NORTE VD', TRUE, TRUE),
  ('sur.of.vd@gelsa.com.co', '$2a$12$067l4x57B8Mvhb7nJ/GqXudmAK3gR3eYf9bH0XvD9h22K6A7U5O3G', 'Revisor SUR OF - VD', 'REVIEWER', 'SUR OF - VD', TRUE, TRUE),
  ('soacha.of.vd@gelsa.com.co', '$2a$12$067l4x57B8Mvhb7nJ/GqXudmAK3gR3eYf9bH0XvD9h22K6A7U5O3G', 'Revisor SOACHA OF - VD', 'REVIEWER', 'SOACHA OF - VD', TRUE, TRUE),
  ('girardot@gelsa.com.co', '$2a$12$067l4x57B8Mvhb7nJ/GqXudmAK3gR3eYf9bH0XvD9h22K6A7U5O3G', 'Revisor GIRARDOT', 'REVIEWER', 'GIRARDOT', TRUE, TRUE),
  ('fusagasuga@gelsa.com.co', '$2a$12$067l4x57B8Mvhb7nJ/GqXudmAK3gR3eYf9bH0XvD9h22K6A7U5O3G', 'Revisor FUSAGASUGA', 'REVIEWER', 'FUSAGASUGA', TRUE, TRUE),
  ('facatativa@gelsa.com.co', '$2a$12$067l4x57B8Mvhb7nJ/GqXudmAK3gR3eYf9bH0XvD9h22K6A7U5O3G', 'Revisor FACATATIVA', 'REVIEWER', 'FACATATIVA', TRUE, TRUE),
  ('villeta@gelsa.com.co', '$2a$12$067l4x57B8Mvhb7nJ/GqXudmAK3gR3eYf9bH0XvD9h22K6A7U5O3G', 'Revisor VILLETA', 'REVIEWER', 'VILLETA', TRUE, TRUE),
  ('zipaquira.oriente@gelsa.com.co', '$2a$12$067l4x57B8Mvhb7nJ/GqXudmAK3gR3eYf9bH0XvD9h22K6A7U5O3G', 'Revisor ZIPAQUIRA - ORIENTE', 'REVIEWER', 'ZIPAQUIRA - ORIENTE', TRUE, TRUE),
  ('cajeros@gelsa.com.co', '$2a$12$067l4x57B8Mvhb7nJ/GqXudmAK3gR3eYf9bH0XvD9h22K6A7U5O3G', 'Revisor CAJEROS', 'REVIEWER', 'CAJEROS', TRUE, TRUE)
) AS u(email, password_hash, display_name, role, zona_asignada, active, must_change_password)
WHERE NOT EXISTS (
  SELECT 1 FROM public.Usuarios_Nomina WHERE LOWER(public.Usuarios_Nomina.email) = LOWER(u.email)
);
