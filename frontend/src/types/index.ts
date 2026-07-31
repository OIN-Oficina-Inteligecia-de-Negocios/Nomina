export type Status = 'PENDIENTE_REVISION' | 'APROBADA' | 'DENEGADA';

export type User = {
  id: number;
  email: string;
  displayName: string;
  role: string;
};

export type Incapacity = {
  id: number;
  chat_id: string;
  tipo: string;
  datos: Record<string, unknown>;
  estado_tramite: Status;
  url_documento: string | null;
  nombre_archivo: string | null;
  fecha_creacion: string;
  cedula: string | null;
  nombre_completo: string | null;
  eps: string | null;
  jefe_inmediato: string | null;
  zona_area: string | null;
};

export type HistoryEntry = {
  id: number;
  action: 'APROBADA' | 'DENEGADA';
  observation: string | null;
  reviewer_email: string;
  created_at: string;
};

export type Summary = {
  total: number;
  pending: number;
  approved: number;
  denied: number;
  pending_over_24h: number;
};
