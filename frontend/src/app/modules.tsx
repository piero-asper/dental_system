import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router-dom';
import { CalendarDays, ClipboardList, FileBarChart, LayoutDashboard, Package, Stethoscope, UserRound, WalletCards } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PacientesPage } from '@/features/pacientes/pages/PacientesPage';
import { CitasPage } from '@/features/citas/pages/CitasPage';
import { HistoriasClinicasPage } from '@/features/historias-clinicas/pages/HistoriasClinicasPage';
import { ModulePlaceholder } from '@/shared/components/ModulePlaceholder';
import { PanelPage,ReportesPage } from '@/features/bi/pages/BiPage';

export type ModuleDefinition = {
  path: string;
  title: string;
  description: string;
  label?: string;
  icon: LucideIcon;
  Page?: ComponentType;
};

// Todo modulo nuevo comienza en construccion. Agregar Page cuando este implementado.
export const modules: readonly ModuleDefinition[] = [
  { path: 'panel', title: 'Panel', description: 'Indicadores del día y pendientes de atención.', icon: LayoutDashboard,Page:PanelPage },
  { path: 'pacientes', title: 'Pacientes', description: 'Permitirá registrar, buscar y consultar las fichas de los pacientes.', icon: UserRound, Page: PacientesPage },
  { path: 'citas', title: 'Citas', description: 'Permitirá reservar, reprogramar y consultar las citas de la clínica.', icon: CalendarDays, Page: CitasPage },
  { path: 'historias-clinicas', title: 'Historias clínicas', label: 'Historias', description: 'Permitirá consultar antecedentes, evoluciones y odontogramas por paciente.', icon: ClipboardList, Page: HistoriasClinicasPage },
  { path: 'tratamientos', title: 'Tratamientos', description: 'Permitirá gestionar el catálogo de tratamientos, sus precios y los presupuestos de cada paciente.', icon: Stethoscope },
  { path: 'pagos', title: 'Pagos', description: 'Permitirá registrar cobros, consultar la caja diaria, emitir comprobantes y dar seguimiento a las deudas de los pacientes.', icon: WalletCards },
  { path: 'inventario', title: 'Inventario', description: 'Permitirá registrar insumos, controlar existencias y movimientos, y consultar alertas de stock bajo.', icon: Package },
  { path: 'reportes', title: 'Reportes', description: 'Indicadores, comparaciones y exportación de datos operativos.', icon: FileBarChart,Page:ReportesPage }
];

export function createModuleRoutes(definitions: readonly ModuleDefinition[]): RouteObject[] {
  return definitions.map(({ path, title, description, Page }) => ({
    path,
    element: Page ? <Page /> : <ModulePlaceholder title={title} description={description} />
  }));
}

export function createModuleNavigation(definitions: readonly ModuleDefinition[]) {
  return definitions.map(({ path, title, label, icon }) => ({ to: `/${path}`, label: label ?? title, icon }));
}
