import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DecisionDialog } from '../components/DecisionDialog';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { api, apiBlob } from '../lib/api';
import type { HistoryEntry, Incapacity } from '../types';

const dateFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' });

const date = (value?: string | null) => {
  const rawValue = value?.trim();
  if (!rawValue) return 'No registrada';

  // Los datos históricos de n8n usan DD/MM/YYYY, mientras que los nuevos
  // registros pueden llegar como YYYY-MM-DD o como una fecha ISO completa.
  const colombianDate = rawValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const normalizedValue = colombianDate
    ? `${colombianDate[3]}-${colombianDate[2]}-${colombianDate[1]}T12:00:00`
    : /^\d{4}-\d{2}-\d{2}$/.test(rawValue)
      ? `${rawValue}T12:00:00`
      : rawValue;
  const parsedDate = new Date(normalizedValue);

  return Number.isNaN(parsedDate.getTime())
    ? 'No registrada'
    : dateFormatter.format(parsedDate);
};


export function IncapacityPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<Incapacity | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [dialog, setDialog] = useState<'approve' | 'deny' | null>(null);
  const [busy, setBusy] = useState(false);
  const [documentBusy, setDocumentBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const result = await api<{ item: Incapacity; history: HistoryEntry[] }>(
        `/incapacidades/${id}`,
      );
      setItem(result.item);
      setHistory(result.history);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible cargar el radicado');
    }
  }
  useEffect(() => { void load(); }, [id]);

  async function decide(observation?: string) {
    if (!dialog) return;
    setBusy(true);
    setError('');
    try {
      const result = await api<{ item: Incapacity }>(
        `/incapacidades/${id}/${dialog}`,
        {
          method: 'POST',
          body: JSON.stringify(dialog === 'deny' ? { observation } : {}),
        },
      );
      setItem(result.item);
      setDialog(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible registrar la decisión');
      setDialog(null);
    } finally {
      setBusy(false);
    }
  }

  async function openDocument() {
    const previewWindow = window.open('', '_blank');
    if (previewWindow) previewWindow.opener = null;
    setDocumentBusy(true);
    setError('');
    try {
      const blob = await apiBlob(`/incapacidades/${id}/document`);
      const blobUrl = URL.createObjectURL(blob);
      if (previewWindow) {
        previewWindow.location.href = blobUrl;
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (caught) {
      previewWindow?.close();
      setError(caught instanceof Error ? caught.message : 'No fue posible abrir el PDF');
    } finally {
      setDocumentBusy(false);
    }
  }
  const data = item?.datos ?? {};
  const fields = [
    { label: 'Colaborador', value: item?.nombre_completo, icon: UserRound },
    { label: 'Cédula', value: item?.cedula, icon: FileText },
    { label: 'EPS', value: item?.eps, icon: Building2 },
    { label: 'Zona / área', value: item?.zona_area, icon: MapPin },
    { label: 'Correo jefe inmediato', value: item?.jefe_inmediato, icon: Mail },
    { label: 'Fecha de registro', value: item ? date(item.fecha_creacion.slice(0, 10)) : '', icon: CalendarDays },
  ];

  return (
    <Layout>
      <button className="back-link" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Volver a incapacidades
      </button>
      {error && <div className="alert alert--error">{error}</div>}
      {!item ? (
        <div className="workspace-card empty-state">Cargando radicado…</div>
      ) : (
        <>
          <div className="detail-heading">
            <div>
              <p className="eyebrow">Expediente de incapacidad</p>
              <div className="detail-heading__title">
                <h1>Radicado #{item.id}</h1>
                <StatusBadge status={item.estado_tramite} />
              </div>
              <p className="muted">{item.tipo}</p>
            </div>
            {item.estado_tramite === 'PENDIENTE_REVISION' && (
              <div className="decision-actions">
                <button className="button button--danger-outline" onClick={() => setDialog('deny')}>
                  <X size={18} /> Denegar
                </button>
                <button className="button button--primary" onClick={() => setDialog('approve')}>
                  <Check size={18} /> Aprobar incapacidad
                </button>
              </div>
            )}
          </div>

          <div className="detail-grid">
            <section className="workspace-card detail-card">
              <div className="section-title">
                <div><p className="eyebrow">Información</p><h2>Datos del solicitante</h2></div>
              </div>
              <dl className="info-grid">
                {fields.map(({ label, value, icon: Icon }) => (
                  <div key={label}>
                    <dt><Icon size={16} /> {label}</dt>
                    <dd>{value || 'No registrado'}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <aside className="workspace-card document-card">
              <span className="document-card__icon"><FileText size={27} /></span>
              <div>
                <p className="eyebrow">Documento consolidado</p>
                <h2>{item.nombre_archivo || `Incapacidad-${item.id}.pdf`}</h2>
                <p className="muted">Abre el PDF para verificar los soportes antes de decidir.</p>
              </div>
              {item.url_documento ? (
                <button
                  className="button button--secondary button--full"
                  disabled={documentBusy}
                  onClick={() => void openDocument()}
                >
                  {documentBusy ? 'Abriendo PDF…' : 'Abrir PDF'} <ExternalLink size={17} />
                </button>
              ) : (
                <div className="alert alert--warning">Este radicado no tiene una URL de documento.</div>
              )}
            </aside>

            <section className="workspace-card detail-card">
              <div className="section-title"><div><p className="eyebrow">Solicitud</p><h2>Datos de la incapacidad</h2></div></div>
              <dl className="info-grid">
                <div><dt>Fecha de inicio</dt><dd>{date(String(data.fecha_inicio ?? ''))}</dd></div>
                <div><dt>Fecha de finalización</dt><dd>{date(String(data.fecha_fin ?? ''))}</dd></div>
                <div><dt>Tipo de incapacidad</dt><dd>{String(data.label ?? item.tipo)}</dd></div>
                <div><dt>Teléfono de contacto</dt><dd>{item.chat_id}</dd></div>
              </dl>
            </section>

            <section className="workspace-card detail-card">
              <div className="section-title"><div><p className="eyebrow">Auditoría</p><h2>Historial de decisiones</h2></div></div>
              {!history.length ? (
                <p className="muted">Aún no se han registrado decisiones.</p>
              ) : (
                <ol className="timeline">
                  {history.map((entry) => (
                    <li key={entry.id}>
                      <span className={entry.action === 'APROBADA' ? 'success' : 'danger'} />
                      <div>
                        <strong>{entry.action === 'APROBADA' ? 'Solicitud aprobada' : 'Solicitud denegada'}</strong>
                        <small>{entry.reviewer_email} · {new Date(entry.created_at).toLocaleString('es-CO')}</small>
                        {entry.observation && <p>{entry.observation}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </>
      )}
      {dialog && item && (
        <DecisionDialog
          action={dialog}
          radicado={item.id}
          busy={busy}
          onClose={() => !busy && setDialog(null)}
          onConfirm={decide}
        />
      )}
    </Layout>
  );
}
