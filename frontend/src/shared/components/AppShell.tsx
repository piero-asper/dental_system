import { CalendarDays, ClipboardList, FileBarChart, LayoutDashboard, Package, Receipt, Stethoscope, UserRound, WalletCards } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

const navigation = [
  { to: '/panel', label: 'Panel', icon: LayoutDashboard },
  { to: '/pacientes', label: 'Pacientes', icon: UserRound },
  { to: '/citas', label: 'Citas', icon: CalendarDays },
  { to: '/historias-clinicas', label: 'Historias', icon: ClipboardList },
  { to: '/tratamientos', label: 'Tratamientos', icon: Stethoscope },
  { to: '/pagos', label: 'Pagos', icon: WalletCards },
  { to: '/inventario', label: 'Inventario', icon: Package },
  { to: '/reportes', label: 'Reportes', icon: FileBarChart },
  { to: '/login', label: 'Sesion', icon: Receipt }
];

export function AppShell() {
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
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

