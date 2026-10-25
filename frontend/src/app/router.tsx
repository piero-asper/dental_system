import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '@/features/autenticacion/pages/LoginPage';
import { PacienteFormPage } from '@/features/pacientes/pages/PacienteFormPage';
import { PacienteDetallePage } from '@/features/pacientes/pages/PacienteDetallePage';
import { AppShell } from '@/shared/components/AppShell';
import { ProtectedRoute } from '@/shared/auth/ProtectedRoute';
import { createModuleNavigation, createModuleRoutes, modules } from './modules';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    element: <ProtectedRoute />,
    children: [{
      path: '/',
      element: <AppShell navigation={createModuleNavigation(modules)} />,
      children: [
        { index: true, element: <Navigate to="/panel" replace /> },
        ...createModuleRoutes(modules),
        { path: 'pacientes/nuevo', element: <PacienteFormPage /> },
        { path: 'pacientes/:id', element: <PacienteDetallePage /> },
        { path: 'pacientes/:id/editar', element: <PacienteFormPage /> },
        { path: '*', element: <Navigate to="/panel" replace /> }
      ]
    }]
  }
]);

