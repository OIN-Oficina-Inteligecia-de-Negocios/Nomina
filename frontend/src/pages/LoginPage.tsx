import { ArrowRight, ClipboardCheck, LockKeyhole, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No fue posible ingresar');
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
              backgroundColor: 'rgba(255, 255, 255, 0.07)',
              backdropFilter: 'blur(8px)',
              borderRadius: '0.625rem',
              padding: '0.5rem 1rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }}
          >
            <span
              style={{
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '0.5rem',
                backgroundColor: 'rgba(255, 200, 5, 0.15)',
                color: '#FFC805',
                display: 'grid',
                placeItems: 'center',
                border: '1px solid rgba(255, 200, 5, 0.3)',
              }}
            >
              <ClipboardCheck size={20} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <strong style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>LIA</strong>
              <small style={{ color: '#FFC805', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>NÓMINA</small>
            </div>
          </div>
        </div>

        <div>
          <div className="eyebrow" style={{ color: '#FFC805' }}>
            <span className="eyebrow-dot" style={{ backgroundColor: '#FFC805' }} /> Gestión Interna
          </div>
          <h1>Decisiones claras para cada incapacidad.</h1>
          <p>
            Consulta el expediente, verifica el PDF y registra la aprobación o
            la observación que debe atender el colaborador.
          </p>
        </div>

        <small style={{ color: '#94a3b8' }}>Acceso exclusivo para personal autorizado de Gelsa.</small>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="eyebrow">
            <span className="eyebrow-dot" /> Bienvenido
          </div>
          <h2>Inicia sesión</h2>
          <p className="muted">Usa las credenciales configuradas para el aplicativo.</p>

          <label className="field">
            <span>Correo corporativo</span>
            <div className="input-with-icon">
              <Mail size={16} style={{ color: '#94a3b8' }} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nombre@gelsa.com.co"
                autoComplete="username"
                required
              />
            </div>
          </label>

          <label className="field">
            <span>Contraseña</span>
            <div className="input-with-icon">
              <LockKeyhole size={16} style={{ color: '#94a3b8' }} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          {error && <div className="alert alert--error" style={{ margin: '0.5rem 0' }}>{error}</div>}

          <button className="button button--primary button--full" disabled={busy} style={{ marginTop: '0.5rem' }}>
            {busy ? 'Validando…' : 'Ingresar'}
            {!busy && <ArrowRight size={16} />}
          </button>
        </form>
      </section>
    </main>
  );
}
