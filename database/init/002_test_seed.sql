INSERT INTO empleados (
  chat_id, cedula, nombre_completo, eps, eps_nombre,
  jefe_inmediato, zona_area, zona_spt
) VALUES
  (573001110001, '1019001001', 'Laura Marcela Gómez', 'Salud Total EPS', 'Salud Total EPS', 'maria.jefe@gelsa.com.co', 'Occidente Oficina', 'Occidente Oficina'),
  (573001110002, '1019001002', 'Andrés Felipe Rojas', 'Sanitas EPS', 'Sanitas EPS', 'carlos.jefe@gelsa.com.co', 'Norte VD', 'Norte VD'),
  (573001110003, '1019001003', 'Diana Carolina Pérez', 'Nueva EPS', 'Nueva EPS', 'ana.jefe@gelsa.com.co', 'Soacha Oficina', 'Soacha Oficina'),
  (573001110004, '1019001004', 'Miguel Ángel Torres', 'Sura EPS', 'Sura EPS', 'luisa.jefe@gelsa.com.co', 'Girardot', 'Girardot')
ON CONFLICT (chat_id) DO NOTHING;

INSERT INTO incapacidades (
  chat_id, tipo, pk_tipo, datos, estado_tramite,
  url_documento, nombre_archivo, fecha_creacion
) VALUES
  (
    573001110001,
    'ENFERMEDAD',
    1,
    '{"fecha_inicio":"2026-07-23","fecha_fin":"2026-07-26","paginas_fusionadas":2}'::jsonb,
    'PENDIENTE_REVISION',
    'https://example.com/incapacidades/ENFERMEDAD/1019001001/1019001001_ENFERMEDAD_1001_completo.pdf',
    '1019001001_ENFERMEDAD_1001_completo.pdf',
    NOW() - INTERVAL '45 minutes'
  ),
  (
    573001110002,
    'TRANSITO',
    4,
    '{"fecha_inicio":"2026-07-20","fecha_fin":"2026-07-30","paginas_fusionadas":4}'::jsonb,
    'PENDIENTE_REVISION',
    'https://example.com/incapacidades/TRANSITO/1019001002/1019001002_TRANSITO_1002_completo.pdf',
    '1019001002_TRANSITO_1002_completo.pdf',
    NOW() - INTERVAL '3 hours'
  ),
  (
    573001110003,
    'MATERNIDAD',
    2,
    '{"fecha_inicio":"2026-07-10","fecha_fin":"2026-10-16","paginas_fusionadas":3,"approval_status":"APROBADA"}'::jsonb,
    'APROBADA',
    'https://example.com/incapacidades/MATERNIDAD/1019001003/1019001003_MATERNIDAD_1003_completo.pdf',
    '1019001003_MATERNIDAD_1003_completo.pdf',
    NOW() - INTERVAL '1 day'
  ),
  (
    573001110004,
    'TRABAJO',
    5,
    '{"fecha_inicio":"2026-07-18","fecha_fin":"2026-07-19","paginas_fusionadas":1,"approval_status":"DENEGADA","observacion_denegacion":"El documento no tiene firma médica."}'::jsonb,
    'DENEGADA',
    'https://example.com/incapacidades/TRABAJO/1019001004/1019001004_TRABAJO_1004_completo.pdf',
    '1019001004_TRABAJO_1004_completo.pdf',
    NOW() - INTERVAL '2 days'
  );

