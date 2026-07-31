import { CheckCircle2, X, XCircle } from 'lucide-react';
import { useState } from 'react';

type Props = {
  action: 'approve' | 'deny';
  radicado: number;
  busy: boolean;
  onClose: () => void;
  onConfirm: (observation?: string) => Promise<void>;
};

export function DecisionDialog({
  action,
  radicado,
  busy,
  onClose,
  onConfirm,
}: Props) {
  const [observation, setObservation] = useState('');
  const isDeny = action === 'deny';
  const valid = !isDeny || observation.trim().length >= 5;

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="decision-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="dialog__close" onClick={onClose} disabled={busy}>
          <X size={19} /><span className="sr-only">Cerrar</span>
        </button>
        <div className={`dialog__symbol ${isDeny ? 'danger' : 'success'}`}>
          {isDeny ? <XCircle size={30} /> : <CheckCircle2 size={30} />}
        </div>
        <h2 id="decision-title">
          {isDeny ? 'Denegar incapacidad' : 'Aprobar incapacidad'}
        </h2>
        <p>
          Radicado <strong>#{radicado}</strong>. Esta decisión quedará registrada
          con tu correo y no podrá repetirse.
        </p>
        {isDeny && (
          <label className="field">
            <span>Motivo de la denegación</span>
            <textarea
              autoFocus
              rows={5}
              maxLength={1000}
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
              placeholder="Indica claramente qué debe corregir el solicitante…"
            />
            <small>Mínimo 5 caracteres. Se enviará al usuario.</small>
          </label>
        )}
        <div className="dialog__actions">
          <button className="button button--secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            className={`button ${isDeny ? 'button--danger' : 'button--primary'}`}
            disabled={busy || !valid}
            onClick={() => onConfirm(isDeny ? observation.trim() : undefined)}
          >
            {busy ? 'Procesando…' : isDeny ? 'Confirmar denegación' : 'Confirmar aprobación'}
          </button>
        </div>
      </section>
    </div>
  );
}
