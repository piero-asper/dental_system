import { ChevronRight, LogOut, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { confirmDiscard, UnsavedNavigation } from './UnsavedChanges';
import { BrandLogo } from './BrandLogo';
import { SessionLoadingScreen } from './SessionLoadingScreen';
import { ModuleLoadingScreen } from './ModuleLoadingScreen';

type NavigationItem = { to: string; label: string; icon: LucideIcon; section?: string };

export function AppShell({ navigation }: { navigation: readonly NavigationItem[] }) {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const isDashboard = useLocation().pathname === '/panel';
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const sections = [...new Set(navigation.map((item) => item.section ?? 'Gestión clínica'))];
  const activeModule = [...navigation].sort((a, b) => b.to.length - a.to.length).find((item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));

  useEffect(() => {
    const timer = window.setTimeout(() => setInitialLoading(false), 600);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleSignOut() {
    if(!confirmDiscard())return;
    setClosing(true);
    setError(null);
    try { await signOut(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cerrar la sesión.'); }
    finally { setClosing(false); }
  }

  if (closing) {
    return <SessionLoadingScreen
      title="Cerrando tu sesión"
      description="Estamos cerrando tu acceso de forma segura."
    />;
  }

  return (
    <div className={`app-shell dental-shell${isDashboard ? ' dashboard-shell' : ''}`}>
      <UnsavedNavigation />
      <aside className="sidebar" aria-label="Navegacion principal">
        <div className="brand"><BrandLogo inverse /></div>
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
          <div className="app-topbar-actions">
            <div className="app-profile">
              <span className="app-profile-avatar" aria-hidden="true"><UserRound size={16} /></span>
              <span><strong>Cuenta de la clínica</strong><small>{user?.email ?? 'Gestión clínica'}</small></span>
            </div>
            <button className="secondary-button logout-button" disabled={closing} onClick={() => { void handleSignOut(); }}><LogOut aria-hidden="true" size={17}/>{closing ? 'Cerrando…' : 'Cerrar sesión'}</button>
          </div>
        </header>
        {error && <p className="form-error topbar-error" role="alert">{error}</p>}
        <div className={`module-outlet${initialLoading ? ' is-loading' : ''}`}>
          <div className={`module-outlet-content${initialLoading ? ' is-loading' : ''}`}><Outlet /></div>
          {initialLoading && <ModuleLoadingScreen moduleName="Dental System" />}
        </div>
      </main>
    </div>
  );
}

