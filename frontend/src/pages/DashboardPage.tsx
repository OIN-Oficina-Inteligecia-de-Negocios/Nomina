import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Search,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../lib/api';
import type { Incapacity, Status, Summary } from '../types';

type ListResponse = {
  items: Incapacity[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [result, setResult] = useState<ListResponse | null>(null);
  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [status, setStatus] = useState<'TODAS' | Status>('PENDIENTE_REVISION');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        status,
        search: committedSearch,
        page: String(page),
        limit: '20',
      });
      const [summaryData, listData] = await Promise.all([
        api<Summary>('/dashboard/summary'),
        api<ListResponse>(`/incapacidades?${params}`),
      ]);
      setSummary(summaryData);
      setResult(listData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [committedSearch, page, status]);

  useEffect(() => { void load(); }, [load]);

  const cards = [
    { label: 'Pendientes', value: summary?.pending, icon: Clock3, tone: 'amber' },
    { label: 'Aprobadas', value: summary?.approved, icon: CheckCircle2, tone: 'green' },
    { label: 'Denegadas', value: summary?.denied, icon: XCircle, tone: 'red' },
    { label: 'Total solicitudes', value: summary?.total, icon: FileText, tone: 'blue' },
  ];

  return (
    <Layout>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Centro de revisión</p>
          <h1>Incapacidades</h1>
          <p className="muted">Revisa primero las solicitudes pendientes y deja trazabilidad de cada decisión.</p>
        </div>
        {!!summary?.pending_over_24h && (
          <div className="aging-alert">
            <AlertTriangle size={19} />
            <span><strong>{summary.pending_over_24h}</strong> pendientes hace más de 24 horas</span>
          </div>
        )}
      </div>

      <section className="metrics" aria-label="Resumen">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <article className="metric" key={label}>
            <span className={`metric__icon metric__icon--${tone}`}><Icon size={21} /></span>
            <div><strong>{value ?? '—'}</strong><span>{label}</span></div>
          </article>
        ))}
      </section>

      <section className="workspace-card">
        <div className="toolbar">
          <form
            className="search"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setCommittedSearch(search.trim());
            }}
          >
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por radicado, cédula o nombre"
              aria-label="Buscar incapacidades"
            />
          </form>
          <label className="select-field">
            <span className="sr-only">Filtrar por estado</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as 'TODAS' | Status);
                setPage(1);
              }}
            >
              <option value="PENDIENTE_REVISION">Pendientes</option>
              <option value="APROBADA">Aprobadas</option>
              <option value="DENEGADA">Denegadas</option>
              <option value="TODAS">Todos los estados</option>
            </select>
          </label>
        </div>

        {error && <div className="alert alert--error">{error}</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Radicado</th>
                <th>Colaborador</th>
                <th>Tipo</th>
                <th>Fecha de registro</th>
                <th>Estado</th>
                <th><span className="sr-only">Acción</span></th>
              </tr>
            </thead>
            <tbody>
              {!loading && result?.items.map((item) => (
                <tr key={item.id}>
                  <td><strong className="radicado">#{item.id}</strong></td>
                  <td>
                    <strong>{item.nombre_completo ?? 'Sin nombre'}</strong>
                    <small>CC {item.cedula ?? 'No registrada'}</small>
                  </td>
                  <td>{item.tipo}</td>
                  <td>{formatDate(item.fecha_creacion)}</td>
                  <td><StatusBadge status={item.estado_tramite} /></td>
                  <td><Link className="table-link" to={`/incapacidades/${item.id}`}>Revisar</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="empty-state">Cargando solicitudes…</div>}
          {!loading && !result?.items.length && (
            <div className="empty-state">
              <FileText size={30} />
              <strong>No encontramos solicitudes</strong>
              <span>Ajusta la búsqueda o selecciona otro estado.</span>
            </div>
          )}
        </div>

        {result && result.pagination.total > 0 && (
          <footer className="pagination">
            <span>{result.pagination.total} solicitudes</span>
            <div>
              <button
                className="icon-button"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              ><ChevronLeft size={18} /><span className="sr-only">Anterior</span></button>
              <span>Página {page} de {result.pagination.pages}</span>
              <button
                className="icon-button"
                disabled={page >= result.pagination.pages}
                onClick={() => setPage((value) => value + 1)}
              ><ChevronRight size={18} /><span className="sr-only">Siguiente</span></button>
            </div>
          </footer>
        )}
      </section>
    </Layout>
  );
}
