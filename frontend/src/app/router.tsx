import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@/features/autenticacion/pages/LoginPage';
import { PacientesPage } from '@/features/pacientes/pages/PacientesPage';
import { PacienteFormPage } from '@/features/pacientes/pages/PacienteFormPage';
import { PacienteDetallePage } from '@/features/pacientes/pages/PacienteDetallePage';
import { CitasPage } from '@/features/citas/pages/CitasPage';
import { HistoriasClinicasPage } from '@/features/historias-clinicas/pages/HistoriasClinicasPage';
import { TratamientosPage } from '@/features/tratamientos/pages/TratamientosPage';
import { PagosPage } from '@/features/pagos/pages/PagosPage';
import { InventarioPage } from '@/features/inventario/pages/InventarioPage';
import { PanelPage } from '@/features/panel/pages/PanelPage';
import { ReportesPage } from '@/features/reportes/pages/ReportesPage';
import { AppShell } from '@/shared/components/AppShell';
import { ProtectedRoute } from '@/shared/auth/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    element: <ProtectedRoute />,
    children: [{
      path: '/',
      element: <AppShell />,
      children: [
        { index: true, element: <Navigate to="/panel" replace /> },
        { path: 'panel', element: <PanelPage /> },
        { path: 'pacientes', element: <PacientesPage /> },
        { path: 'pacientes/nuevo', element: <PacienteFormPage /> },
        { path: 'pacientes/:id', element: <PacienteDetallePage /> },
        { path: 'pacientes/:id/editar', element: <PacienteFormPage /> },
        { path: 'citas', element: <CitasPage /> },
        { path: 'historias-clinicas', element: <HistoriasClinicasPage /> },
        { path: 'tratamientos', element: <TratamientosPage /> },
        { path: 'pagos', element: <PagosPage /> },
        { path: 'inventario', element: <InventarioPage /> },
        { path: 'reportes', element: <ReportesPage /> },
        { path: '*', element: <Navigate to="/panel" replace /> }
      ]
    }]
  }
]);

