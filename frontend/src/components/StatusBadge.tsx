import type { Status } from '../types';

const labels: Record<Status, string> = {
  PENDIENTE_REVISION: 'Pendiente',
  APROBADA: 'Aprobada',
  DENEGADA: 'Denegada',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status status--${status.toLowerCase()}`}>
      <span aria-hidden="true" />
      {labels[status]}
    </span>
  );
}
