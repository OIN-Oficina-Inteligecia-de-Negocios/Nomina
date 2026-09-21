import { ArrowRight, ClipboardCheck, LockKeyhole } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ChangePasswordPage() {
  const { changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setBusy(true);
    try {
      await changePassword(password);
      navigate('/', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible cambiar la contraseña');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="login-intro__brand">
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.5rem',
              padding: '0.5rem 1rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.625rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <span
              style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '0.375rem',
                backgroundColor: '#0B2545',
                color: '#FFC805',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <ClipboardCheck size={18} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <strong style={{ color: '#0B2545', fontSize: '1.125rem', fontWeight: 800 }}>LIA</strong>
              <small style={{ color: '#64748b', fontSize: '0.6875rem', fontWeight: 600 }}>NÓMINA</small>
            </div>
          </div>
        </div>

        <div>
          <div className="eyebrow" style={{ color: '#FFC805' }}>
            <span className="eyebrow-dot" style={{ backgroundColor: '#FFC805' }} /> Seguridad Requerida
          </div>
          <h1>Actualiza tu contraseña de acceso.</h1>
          <p>
            Dado que es tu primer inicio de sesión o se ha solicitado un reinicio de seguridad,
            es obligatorio que configures una nueva clave antes de continuar.
          </p>
        </div>

        <small style={{ color: '#94a3b8' }}>Lineamientos de seguridad internos de Gelsa.</small>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> Primer ingreso
          </div>
          <h2>Nueva Contraseña</h2>
          <p className="muted">Ingresa una clave segura que no hayas utilizado antes.</p>

          <label className="field">
            <span>Nueva contraseña</span>
            <div className="input-with-icon">
              <LockKeyhole size={16} style={{ color: '#94a3b8' }} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                autoComplete="new-password"
              />
            </div>
          </label>

          <label className="field">
            <span>Confirmar nueva contraseña</span>
            <div className="input-with-icon">
              <LockKeyhole size={16} style={{ color: '#94a3b8' }} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repite la contraseña"
                required
                autoComplete="new-password"
              />
            </div>
          </label>

          {error && <div className="alert alert--error">{error}</div>}

          <button className="button button--primary button--full" disabled={busy} style={{ marginTop: '0.5rem' }}>
            {busy ? 'Guardando clave…' : 'Establecer contraseña'}
            {!busy && <ArrowRight size={16} />}
          </button>

          <button
            type="button"
            className="button button--secondary button--full"
            style={{ marginTop: '0.75rem' }}
            onClick={logout}
            disabled={busy}
          >
            Cancelar y salir
          </button>
        </form>
      </section>
    </main>
  );
}
