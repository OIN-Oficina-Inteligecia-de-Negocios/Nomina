import type { Status } from '../types';

const labels: Record<Status, string> = {
  PENDIENTE_REVISION: 'Pendiente',
  APROBADA: 'Aprobada',
  DENEGADA: 'Denegada',
};

export function StatusBadge({ status }: { status: Status }) {
  const mod =
    status === 'APROBADA'
      ? 'approved'
      : status === 'DENEGADA'
        ? 'denied'
        : 'pending';

  return (
    <span className={`status-badge status-badge--${mod}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      {labels[status] ?? status}
    </span>
  );
}
