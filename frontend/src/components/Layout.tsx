import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function LiaLogoCard() {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="sidebar__brand-lia-card">
      {!imgError ? (
        <img
          src="/lia-logo.png"
          alt="LIA NÓMINA"
          className="sidebar__brand-lia-img"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="lia-logo-fallback">
          <div className="lia-logo-squircle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFC805" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="4" width="14" height="17" rx="3" />
              <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
              <path d="M9 12.5l2 2 4-4" />
            </svg>
          </div>
          <strong className="lia-logo-title">LIA</strong>
          <span className="lia-logo-sub">N Ó M I N A</span>
          <span className="lia-logo-dot">•</span>
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(
    location.pathname.startsWith('/admin'),
  );

  const closeSidebar = () => setSidebarOpen(false);
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="app-shell">
      {/* Backdrop móvil */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={closeSidebar} aria-hidden />
      )}

      {/* Sidebar Corporativo Navy */}
      <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
        {/* Marca Gelsa | OIN + LIA NÓMINA */}
        <div className="sidebar__brand">
          <div className="sidebar__brand-logo-container">
            <img
              src="/gelsa-oin-logo.png"
              alt="Gelsa | OIN - Oficina de Innovación de Negocios"
              className="sidebar__brand-logo"
            />
          </div>

          <LiaLogoCard />

          <div className="sidebar__brand-subtitle">
            Gestión de Incapacidades
          </div>

          <button
            className="sidebar__close"
            onClick={closeSidebar}
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navegación principal */}
        <nav className="sidebar-nav" aria-label="Navegación principal">
          <Link
            to="/"
            className={`sidebar-nav__item${isActive('/') ? ' sidebar-nav__item--active' : ''}`}
            onClick={closeSidebar}
          >
            <LayoutDashboard size={18} />
            <span>Incapacidades</span>
          </Link>

          {isAdmin && (
            <div className="sidebar-nav__group">
              <button
                type="button"
                className={`sidebar-nav__group-btn${adminOpen ? ' sidebar-nav__group-btn--open' : ''}`}
                onClick={() => setAdminOpen((v) => !v)}
                aria-expanded={adminOpen}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Shield size={18} />
                  <span>Administración</span>
                </span>
                <ChevronDown
                  size={15}
                  className={`sidebar-nav__chevron${adminOpen ? ' sidebar-nav__chevron--open' : ''}`}
                />
              </button>

              {adminOpen && (
                <div className="sidebar-nav__sub">
                  <Link
                    to="/admin/usuarios"
                    className={`sidebar-nav__item sidebar-nav__item--sub${isActive('/admin/usuarios') ? ' sidebar-nav__item--active' : ''}`}
                    onClick={closeSidebar}
                  >
                    <Users size={16} />
                    <span>Usuarios</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Footer del sidebar: perfil de usuario + logout */}
        <div className="sidebar__footer">
          <div className="sidebar__user">
            <span className="sidebar__avatar" aria-hidden>
              {getInitials(user?.displayName)}
            </span>
            <div className="sidebar__user-info">
              <strong>{user?.displayName}</strong>
              <small>
                {isAdmin
                  ? 'Administrador'
                  : (user?.zonaAsignada ?? 'Sin zona asignada')}
              </small>
            </div>
          </div>
          <button
            className="sidebar__logout"
            onClick={logout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="shell-body">
        {/* Barra móvil */}
        <header className="mobile-bar">
          <button
            className="mobile-bar__menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <Link className="mobile-bar__brand" to="/">
            <img
              src="/gelsa-oin-logo.png"
              alt="Gelsa | OIN"
              style={{ height: 26, width: 'auto', objectFit: 'contain' }}
            />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#FFC805', marginLeft: 6 }}>
              LIA NÓMINA
            </span>
          </Link>
          <div style={{ width: 32 }} aria-hidden />
        </header>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
