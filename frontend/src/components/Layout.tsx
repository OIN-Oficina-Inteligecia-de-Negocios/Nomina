import { ClipboardCheck, LogOut, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand__mark"><ClipboardCheck size={22} /></span>
          <span>
            <strong>LIA</strong>
            <small>Gestión de incapacidades</small>
          </span>
        </Link>
        <div className="user-menu">
          <span className="user-menu__icon"><ShieldCheck size={17} /></span>
          <span className="user-menu__details">
            <strong>{user?.displayName}</strong>
            <small>{user?.email}</small>
          </span>
          <button className="icon-button" onClick={logout} title="Cerrar sesión">
            <LogOut size={19} />
            <span className="sr-only">Cerrar sesión</span>
          </button>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
