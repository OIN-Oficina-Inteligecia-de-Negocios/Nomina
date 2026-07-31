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
          <ClipboardCheck size={25} />
          <span>LIA</span>
        </div>
        <div>
          <p className="eyebrow">Gestión interna</p>
          <h1>Decisiones claras para cada incapacidad.</h1>
          <p>
            Consulta el expediente, verifica el PDF y registra la aprobación o
            la observación que debe atender el colaborador.
          </p>
        </div>
        <small>Acceso exclusivo para personal autorizado de Gelsa.</small>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <p className="eyebrow">Bienvenido</p>
          <h2>Inicia sesión</h2>
          <p className="muted">Usa las credenciales configuradas para el aplicativo.</p>
          <label className="field">
            <span>Correo corporativo</span>
            <div className="input-with-icon">
              <Mail size={18} />
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
              <LockKeyhole size={18} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </label>
          {error && <div className="alert alert--error">{error}</div>}
          <button className="button button--primary button--full" disabled={busy}>
            {busy ? 'Validando…' : 'Ingresar'}
            {!busy && <ArrowRight size={18} />}
          </button>
        </form>
      </section>
    </main>
  );
}
