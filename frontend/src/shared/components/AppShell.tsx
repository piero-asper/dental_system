import { ChevronRight, LogOut } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { confirmDiscard, UnsavedNavigation } from './UnsavedChanges';

type NavigationItem = { to: string; label: string; icon: LucideIcon; section?: string };

export function AppShell({ navigation }: { navigation: readonly NavigationItem[] }) {
  const { signOut } = useAuth();
  const location = useLocation();
  const isDashboard = useLocation().pathname === '/panel';
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sections = [...new Set(navigation.map((item) => item.section ?? 'Gestión clínica'))];
  const activeModule = [...navigation].sort((a, b) => b.to.length - a.to.length).find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));

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
        <nav aria-label="Módulos del sistema">
          {sections.map((section) => <section className="sidebar-module-section" key={section} aria-label={section}>
          <h2 className="sidebar-section-label">{section}</h2><div className="nav-list">
          {navigation.filter((item) => (item.section ?? 'Gestión clínica') === section).map((item) => {
            const Icon = item.icon;

            return (
              <NavLink key={item.to} to={item.to} className="nav-item">
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}</div></section>)}
        </nav>
      </aside>

      <main className="main-content">
        <header className="app-topbar">
          <nav aria-label="Ubicación"><span>Mi clínica</span><ChevronRight size={14} aria-hidden="true"/><strong>{activeModule?.label ?? 'Sistema Dental'}</strong></nav>
          <div className="app-topbar-actions"><span className="app-account">Cuenta de la clínica</span><button className="secondary-button logout-button" disabled={closing} onClick={() => { void handleSignOut(); }}><LogOut aria-hidden="true" size={17}/>{closing ? 'Cerrando…' : 'Cerrar sesión'}</button></div>
        </header>
        {error && <p className="form-error topbar-error" role="alert">{error}</p>}
        <Outlet />
      </main>
    </div>
  );
}

