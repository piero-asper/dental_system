import { CalendarDays, ClipboardList, FileBarChart, LayoutDashboard, Package, LogOut, Stethoscope, UserRound, WalletCards } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';

const navigation = [
  { to: '/panel', label: 'Panel', icon: LayoutDashboard },
  { to: '/pacientes', label: 'Pacientes', icon: UserRound },
  { to: '/citas', label: 'Citas', icon: CalendarDays },
  { to: '/historias-clinicas', label: 'Historias', icon: ClipboardList },
  { to: '/tratamientos', label: 'Tratamientos', icon: Stethoscope },
  { to: '/pagos', label: 'Pagos', icon: WalletCards },
  { to: '/inventario', label: 'Inventario', icon: Package },
  { to: '/reportes', label: 'Reportes', icon: FileBarChart }
];

export function AppShell() {
  const { user, signOut } = useAuth();
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    setClosing(true);
    setError(null);
    try { await signOut(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cerrar la sesión.'); }
    finally { setClosing(false); }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegacion principal">
        <div className="brand">
          <span className="brand-mark">SD</span>
          <span>Sistema Dental</span>
        </div>

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

