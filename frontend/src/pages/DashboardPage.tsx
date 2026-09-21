import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileSpreadsheet,
  FileText,
  Search,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { api, apiBlob } from '../lib/api';
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
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [result, setResult] = useState<ListResponse | null>(null);
  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');

  const initialStatus =
    user?.role === 'GESTION'
      ? 'APROBADA'
      : user?.role === 'REVIEWER'
        ? 'TODAS'
        : 'PENDIENTE_REVISION';

  const [status, setStatus] = useState<'TODAS' | Status>(initialStatus);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
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

  useEffect(() => {
    void load();
  }, [load]);

  const handleDownloadExcel = () => {
    setExporting(true);
    const params = new URLSearchParams({
      status,
      search: committedSearch,
    });
    apiBlob(`/incapacidades/export?${params}`)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Incapacidades_Filtradas_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error al exportar los datos');
      })
      .finally(() => {
        setExporting(false);
      });
  };

  const handleOpenDocument = (id: number) => {
    const token = sessionStorage.getItem('lia_token');
    const url = `/api/incapacidades/${id}/document${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const cards = [
    { label: 'Pendientes', value: summary?.pending, icon: Clock3, tone: 'amber' },
    { label: 'Aprobadas', value: summary?.approved, icon: CheckCircle2, tone: 'green' },
    { label: 'Denegadas', value: summary?.denied, icon: XCircle, tone: 'red' },
    { label: 'Total solicitudes', value: summary?.total, icon: FileText, tone: 'blue' },
  ];

  const items = result?.items ?? [];

  return (
    <Layout>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> Centro de revisión
          </div>
          <h1>Incapacidades</h1>
          <p className="muted">
            {user?.role === 'GESTION'
              ? 'Consulta las solicitudes de incapacidades aprobadas en todas las zonas.'
              : user?.role === 'REVIEWER'
                ? 'Revisa el historial de solicitudes aprobadas y denegadas de tu zona.'
                : 'Revisa primero las solicitudes pendientes y deja trazabilidad de cada decisión.'}
          </p>
        </div>
        {summary?.pending_over_24h && user?.role === 'ADMIN' ? (
          <div className="aging-alert">
            <AlertTriangle size={17} style={{ color: '#00478F' }} />
            <span>
              <strong style={{ color: '#0f172a' }}>{summary.pending_over_24h}</strong> pendientes hace más de 24 horas
            </span>
          </div>
        ) : null}
      </div>

      <section className="metrics" aria-label="Resumen de métricas">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <article className="metric" key={label}>
            <span className={`metric__icon metric__icon--${tone}`}>
              <Icon size={20} />
            </span>
            <div>
              <strong>{value ?? '—'}</strong>
              <span>{label}</span>
            </div>
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
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por radicado, cédula o nombre"
              aria-label="Buscar incapacidades"
            />
          </form>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              id="btn-export-excel"
              className="button button--secondary"
              disabled={exporting}
              onClick={handleDownloadExcel}
              title="Descargar información filtrada en Excel"
            >
              <FileSpreadsheet size={16} style={{ color: '#059669' }} />
              <span>{exporting ? 'Exportando…' : 'Exportar Excel'}</span>
            </button>

            <label className="select-field">
              <span className="sr-only">Filtrar por estado</span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as 'TODAS' | Status);
                  setPage(1);
                }}
                disabled={user?.role === 'GESTION'}
              >
                {user?.role === 'GESTION' && (
                  <option value="APROBADA">Aprobadas</option>
                )}
                {user?.role === 'REVIEWER' && (
                  <>
                    <option value="TODAS">Aprobadas y Denegadas</option>
                    <option value="APROBADA">Aprobadas</option>
                    <option value="DENEGADA">Denegadas</option>
                  </>
                )}
                {(user?.role === 'ADMIN' || !user?.role) && (
                  <>
                    <option value="PENDIENTE_REVISION">Pendientes</option>
                    <option value="APROBADA">Aprobadas</option>
                    <option value="DENEGADA">Denegadas</option>
                    <option value="TODAS">Todos los estados</option>
                  </>
                )}
              </select>
            </label>
          </div>
        </div>

        {error ? <div className="alert alert--error" style={{ margin: '1rem' }}>{error}</div> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Radicado</th>
                <th>Colaborador</th>
                <th>Tipo</th>
                <th>Fecha de registro</th>
                <th style={{ textAlign: 'center' }}>Estado</th>
                <th>Consolidado</th>
                <th style={{ textAlign: 'right' }}>
                  <span className="sr-only">Acción</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading
                ? items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong className="radicado">#{item.id}</strong>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.25 }}>
                          {item.nombre_completo ?? 'Sin nombre'}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                          CC {item.cedula ?? 'No registrada'}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500, color: '#475569' }}>{item.tipo}</td>
                      <td style={{ color: '#64748b' }}>{formatDate(item.fecha_creacion)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <StatusBadge status={item.estado_tramite} />
                      </td>
                      <td>
                        {item.url_documento ? (
                          <button
                            type="button"
                            className="table-link"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              color: '#0f766e',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontWeight: 600,
                            }}
                            onClick={() => handleOpenDocument(item.id)}
                            title="Validar y abrir el documento consolidado en PDF"
                          >
                            <FileText size={14} /> Documento
                          </button>
                        ) : (
                          <span className="muted" style={{ fontSize: '0.75rem' }}>
                            Sin PDF
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link className="table-link" to={`/incapacidades/${item.id}`}>
                          Revisar
                        </Link>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
          {loading ? <div className="empty-state">Cargando solicitudes…</div> : null}
          {!loading && items.length === 0 ? (
            <div className="empty-state">
              <FileText size={32} style={{ color: '#94a3b8' }} />
              <strong>No encontramos solicitudes</strong>
              <span>Ajusta la búsqueda o selecciona otro estado.</span>
            </div>
          ) : null}
        </div>

        {result && result.pagination.total > 0 ? (
          <footer className="pagination">
            <span>
              Mostrando <strong style={{ color: '#0f172a' }}>{items.length}</strong> de <strong style={{ color: '#0f172a' }}>{result.pagination.total}</strong> solicitudes
            </span>
            <div>
              <button
                className="icon-button"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                <ChevronLeft size={16} />
                <span className="sr-only">Anterior</span>
              </button>
              <span style={{ padding: '0 0.5rem', fontWeight: 500 }}>
                Página {page} de {result.pagination.pages}
              </span>
              <button
                className="icon-button"
                disabled={page >= result.pagination.pages}
                onClick={() => setPage((value) => value + 1)}
              >
                <ChevronRight size={16} />
                <span className="sr-only">Siguiente</span>
              </button>
            </div>
          </footer>
        ) : null}
      </section>
    </Layout>
  );
}
