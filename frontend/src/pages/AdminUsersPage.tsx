import {
  Check,
  ClipboardCopy,
  FileText,
  KeyRound,
  Pencil,
  Plus,
  Shield,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../lib/api';
import type { AdminUser, UserRole } from '../types';

/* ─── Hook para obtener zonas dinámicamente ──────────────── */
function useZonas() {
  const [zonas, setZonas] = useState<string[]>([]);
  useEffect(() => {
    api<{ zonas: string[] }>('/admin/zonas')
      .then((res) => setZonas(res.zonas))
      .catch(() => setZonas([]));
  }, []);
  return zonas;
}

/* ─── Helpers ────────────────────────────────────────────── */
function RoleBadge({ role }: { role: UserRole }) {
  const getRoleLabel = () => {
    if (role === 'ADMIN') return 'Admin';
    if (role === 'GESTION') return 'Gestión';
    return 'Revisor';
  };

  return (
    <span className={`role-badge role-badge--${role.toLowerCase()}`}>
      {role === 'ADMIN' ? <Shield size={11} /> : null}
      {role === 'GESTION' ? <FileText size={11} /> : null}
      {getRoleLabel()}
    </span>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`active-badge active-badge--${active ? 'on' : 'off'}`}>
      <span />
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

/* ─── Modal crear usuario ─────────────────────────────────── */
type CreateForm = {
  displayName: string;
  email: string;
  password: string;
  role: UserRole;
  zonaAsignada: string;
};

const EMPTY_CREATE: CreateForm = {
  displayName: '',
  email: '',
  password: '',
  role: 'REVIEWER',
  zonaAsignada: '',
};

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (user: AdminUser, password: string) => void;
}) {
  const [form, setForm] = useState<CreateForm>(EMPTY_CREATE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const zonas = useZonas();

  const set = (key: keyof CreateForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setForm((f) => ({ ...f, [key]: e.target.value as unknown as string }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api<{ user: AdminUser }>('/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          displayName: form.displayName,
          password: form.password,
          role: form.role,
          zonaAsignada: form.zonaAsignada || undefined,
        }),
      });
      onCreated(result.user, form.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el usuario');
    } finally {
      setBusy(false);
    }
  }

  const isGlobalRole = form.role === 'ADMIN' || form.role === 'GESTION';

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal aria-label="Nuevo usuario">
      <div className="dialog admin-dialog">
        <button className="dialog__close" onClick={onClose} disabled={busy}>
          <X size={16} />
        </button>

        <div className="admin-dialog__header">
          <span className="admin-dialog__icon">
            <Plus size={20} />
          </span>
          <div>
            <h2>Nuevo usuario</h2>
            <p>El usuario deberá cambiar su contraseña al primer inicio de sesión.</p>
          </div>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        <form onSubmit={(e) => void submit(e)} className="admin-form">
          <div className="field">
            <span>Nombre completo</span>
            <div className="input-with-icon">
              <input
                id="new-name"
                value={form.displayName}
                onChange={set('displayName')}
                placeholder="Ej. María García"
                required
                autoComplete="off"
              />
            </div>
          </div>

          <div className="field">
            <span>Correo electrónico</span>
            <div className="input-with-icon">
              <input
                id="new-email"
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="usuario@empresa.com"
                required
                autoComplete="off"
              />
            </div>
          </div>

          <div className="field">
            <span>Contraseña temporal</span>
            <div className="input-with-icon">
              <input
                id="new-password"
                type="text"
                value={form.password}
                onChange={set('password')}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            <small>Se mostrará una sola vez tras crear el usuario.</small>
          </div>

          <div className="admin-form__row">
            <div className="field">
              <span>Rol</span>
              <label className="select-field">
                <select id="new-role" value={form.role} onChange={set('role')}>
                  <option value="REVIEWER">Revisor</option>
                  <option value="GESTION">Gestión</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </label>
            </div>

            <div className="field">
              <span>Zona asignada</span>
              <label className="select-field">
                <select
                  id="new-zona"
                  value={form.zonaAsignada}
                  onChange={set('zonaAsignada')}
                  disabled={isGlobalRole}
                >
                  <option value="">— Seleccionar zona —</option>
                  {zonas.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </label>
              {isGlobalRole && (
                <small>Este rol tiene acceso global a todas las zonas.</small>
              )}
            </div>
          </div>

          <div className="dialog__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancelar
            </button>
            <button type="submit" className="button button--primary" disabled={busy}>
              {busy ? 'Creando…' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal contraseña creada ─────────────────────────────── */
function PasswordModal({
  user,
  password,
  onClose,
}: {
  user: AdminUser;
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal aria-label="Contraseña generada">
      <div className="dialog">
        <div className="dialog__symbol success">
          <Check size={22} />
        </div>
        <h2>Contraseña generada</h2>
        <p>
          Para <strong>{user.display_name}</strong> ({user.email}). Copia la contraseña temporal ahora —{' '}
          <strong>no la podrás ver de nuevo.</strong>
        </p>

        <div className="password-box">
          <code>{password}</code>
          <button className="password-box__copy" onClick={copy} title="Copiar">
            {copied ? <Check size={15} /> : <ClipboardCopy size={15} />}
          </button>
        </div>

        <div className="dialog__actions">
          <button className="button button--primary button--full" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal editar usuario ────────────────────────────────── */
function EditModal({
  user,
  onClose,
  onUpdated,
}: {
  user: AdminUser;
  onClose: () => void;
  onUpdated: (updated: AdminUser) => void;
}) {
  const [zona, setZona] = useState(user.zona_asignada ?? '');
  const [role, setRole] = useState<UserRole>(user.role);
  const [active, setActive] = useState(user.active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const zonas = useZonas();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api<{ user: AdminUser }>(`/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          zonaAsignada: zona || null,
          role,
          active,
        }),
      });
      onUpdated(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el usuario');
    } finally {
      setBusy(false);
    }
  }

  const isGlobalRole = role === 'ADMIN' || role === 'GESTION';

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal aria-label="Editar usuario">
      <div className="dialog admin-dialog">
        <button className="dialog__close" onClick={onClose} disabled={busy}>
          <X size={16} />
        </button>

        <div className="admin-dialog__header">
          <span className="admin-dialog__icon admin-dialog__icon--edit">
            <Pencil size={18} />
          </span>
          <div>
            <h2>Editar usuario</h2>
            <p className="muted">{user.display_name} · {user.email}</p>
          </div>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        <form onSubmit={(e) => void submit(e)} className="admin-form">
          <div className="admin-form__row">
            <div className="field">
              <span>Rol</span>
              <label className="select-field">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  <option value="REVIEWER">Revisor</option>
                  <option value="GESTION">Gestión</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </label>
            </div>

            <div className="field">
              <span>Estado</span>
              <label className="select-field">
                <select
                  value={active ? 'true' : 'false'}
                  onChange={(e) => setActive(e.target.value === 'true')}
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </label>
            </div>
          </div>

          <div className="field">
            <span>Zona asignada</span>
            <label className="select-field">
              <select
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                disabled={isGlobalRole}
              >
                <option value="">— Seleccionar zona —</option>
                {zonas.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </label>
            {isGlobalRole && (
              <small className="muted">Este rol tiene acceso global a todas las zonas.</small>
            )}
          </div>

          <div className="dialog__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancelar
            </button>
            <button type="submit" className="button button--primary" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal restablecer contraseña ────────────────────────── */
function ResetPasswordModal({
  user,
  onClose,
  onReset,
}: {
  user: AdminUser;
  onClose: () => void;
  onReset: (user: AdminUser, tempPassword: string) => void;
}) {
  const [password, setPassword] = useState('Nomina2026*');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api<{ user: AdminUser; temporaryPassword: string }>(
        `/admin/users/${user.id}/reset-password`,
        {
          method: 'POST',
          body: JSON.stringify({ password }),
        },
      );
      onReset(result.user, result.temporaryPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al restablecer contraseña');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="dialog" aria-modal aria-label="Restablecer contraseña">
      <div className="dialog admin-dialog">
        <button className="dialog__close" onClick={onClose} disabled={busy}>
          <X size={16} />
        </button>

        <div className="admin-dialog__header">
          <span className="admin-dialog__icon admin-dialog__icon--edit">
            <KeyRound size={18} />
          </span>
          <div>
            <h2>Restablecer contraseña</h2>
            <p className="muted">{user.display_name} · {user.email}</p>
          </div>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        <form onSubmit={(e) => void submit(e)} className="admin-form">
          <div className="field">
            <span>Nueva contraseña temporal</span>
            <div className="input-with-icon">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>
            <small>
              Se obligará al usuario a cambiar esta contraseña en su siguiente inicio de sesión.
            </small>
          </div>

          <div className="dialog__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancelar
            </button>
            <button type="submit" className="button button--primary" disabled={busy}>
              {busy ? 'Restableciendo…' : 'Restablecer contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Página principal ────────────────────────────────────── */
export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ user: AdminUser; password: string } | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [resettingUser, setResettingUser] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api<{ users: AdminUser[] }>('/admin/users');
      setUsers(result.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function handleCreated(user: AdminUser, password: string) {
    setShowCreate(false);
    setCreatedUser({ user, password });
    setUsers((prev) => [user, ...prev]);
  }

  function handleUpdated(updated: AdminUser) {
    setEditingUser(null);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  function handleReset(updated: AdminUser, tempPassword: string) {
    setResettingUser(null);
    setCreatedUser({ user: updated, password: tempPassword });
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  const active = users.filter((u) => u.active).length;
  const admins = users.filter((u) => u.role === 'ADMIN').length;

  return (
    <Layout>
      <div className="page-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-dot" /> Módulo de administración</p>
          <h1>Usuarios del sistema</h1>
          <p className="muted">
            Gestiona los accesos, roles y las zonas asignadas a cada usuario.
          </p>
        </div>
        <button
          id="btn-nuevo-usuario"
          className="button button--primary"
          onClick={() => setShowCreate(true)}
        >
          <Plus size={17} /> Nuevo usuario
        </button>
      </div>

      {/* Tarjetas de resumen */}
      <section className="metrics" aria-label="Resumen de usuarios">
        <article className="metric">
          <span className="metric__icon metric__icon--blue">
            <Users size={21} />
          </span>
          <div>
            <strong>{users.length}</strong>
            <span>Total usuarios</span>
          </div>
        </article>
        <article className="metric">
          <span className="metric__icon metric__icon--green">
            <UserCheck size={21} />
          </span>
          <div>
            <strong>{active}</strong>
            <span>Activos</span>
          </div>
        </article>
        <article className="metric">
          <span className="metric__icon metric__icon--amber">
            <Shield size={21} />
          </span>
          <div>
            <strong>{admins}</strong>
            <span>Administradores</span>
          </div>
        </article>
        <article className="metric">
          <span className="metric__icon metric__icon--red">
            <UserX size={21} />
          </span>
          <div>
            <strong>{users.length - active}</strong>
            <span>Inactivos</span>
          </div>
        </article>
      </section>

      {/* Tabla */}
      <section className="workspace-card">
        {error && <div className="alert alert--error" style={{ margin: '16px 20px 0' }}>{error}</div>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo electrónico</th>
                <th>Rol</th>
                <th>Zona asignada</th>
                <th>Estado</th>
                <th><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {!loading && users.map((u) => (
                <tr key={u.id} className={!u.active ? 'row--inactive' : ''}>
                  <td>
                    <strong>{u.display_name}</strong>
                    {u.must_change_password && (
                      <small className="pending-pwd">Debe cambiar contraseña</small>
                    )}
                  </td>
                  <td>{u.email}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td>{u.zona_asignada ?? <span className="muted">—</span>}</td>
                  <td><ActiveBadge active={u.active} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <button
                        id={`btn-edit-user-${u.id}`}
                        className="table-link"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        onClick={() => setEditingUser(u)}
                      >
                        Editar
                      </button>
                      <button
                        id={`btn-reset-pwd-user-${u.id}`}
                        className="table-link"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#815c0d' }}
                        onClick={() => setResettingUser(u)}
                      >
                        Restablecer clave
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && <div className="empty-state">Cargando usuarios…</div>}
          {!loading && users.length === 0 && (
            <div className="empty-state">
              <Users size={30} />
              <strong>Sin usuarios registrados</strong>
              <span>Crea el primer usuario con el botón de arriba.</span>
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {createdUser && (
        <PasswordModal
          user={createdUser.user}
          password={createdUser.password}
          onClose={() => setCreatedUser(null)}
        />
      )}
      {editingUser && (
        <EditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdated={handleUpdated}
        />
      )}
      {resettingUser && (
        <ResetPasswordModal
          user={resettingUser}
          onClose={() => setResettingUser(null)}
          onReset={handleReset}
        />
      )}
    </Layout>
  );
}
