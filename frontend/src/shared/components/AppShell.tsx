import { LogOut, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { confirmDiscard, UnsavedNavigation } from './UnsavedChanges';

type NavigationItem = { to: string; label: string; icon: LucideIcon };

export function AppShell({ navigation }: { navigation: readonly NavigationItem[] }) {
  const { user, signOut } = useAuth();
  const isDashboard = useLocation().pathname === '/panel';
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    if(!confirmDiscard())return;
    setClosing(true);
    setError(null);
    try { await signOut(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cerrar la sesión.'); }
    finally { setClosing(false); }
  }

  return (
    <div className={`app-shell dental-shell${isDashboard ? ' dashboard-shell' : ''}`}>
      <UnsavedNavigation />
      <aside className="sidebar" aria-label="Navegacion principal">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M16 6C11 2 5 5 6 12c.4 4 2 7 3 12 .6 3 2 4 3 1l2-7c.5-2 3-2 3.6 0l2 7c1 3 2.5 2 3.2-1 1-5 2.7-8 3-12C27 5 21 2 16 6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M11 8c2-.6 3 1 5 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></span>
          <span>Sistema Dental</span>
        </div>
        <div className="sidebar-clinic"><strong>Consultorio dental</strong><span>Una cuenta · Una agenda</span></div>
        <p className="sidebar-section-label">Gestión clínica</p>
        <nav className="nav-list">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink key={item.to} to={item.to} className="nav-item">
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-session">
          <div className="sidebar-access"><ShieldCheck size={18} aria-hidden="true"/><span>Acceso de la clínica<small>Sesión protegida</small></span></div>
          <p className="session-email">{user?.email}</p>
          <button className="secondary-button logout-button" disabled={closing} onClick={() => { void handleSignOut(); }}>
            <LogOut aria-hidden="true" size={18} />{closing ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

