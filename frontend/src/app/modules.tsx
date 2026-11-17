import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router-dom';
import { CalendarDays, ClipboardList, FileBarChart, LayoutDashboard, Package, Stethoscope, UserRound, WalletCards } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PacientesPage } from '@/features/pacientes/pages/PacientesPage';
import { CitasPage } from '@/features/citas/pages/CitasPage';
import { HistoriasClinicasPage } from '@/features/historias-clinicas/pages/HistoriasClinicasPage';
import { TratamientosPage } from '@/features/tratamientos/pages/TratamientosPage';
import { InventarioPage } from '@/features/inventario/pages/InventarioPage';
import { PagosPage } from '@/features/pagos/pages/PagosPage';
import { ModulePlaceholder } from '@/shared/components/ModulePlaceholder';
import { PanelPage,ReportesPage } from '@/features/bi/pages/BiPage';

export type ModuleDefinition = {
  path: string;
  title: string;
  description: string;
  label?: string;
  icon: LucideIcon;
  Page?: ComponentType;
  section?: string;
};

// Todo modulo nuevo comienza en construccion. Agregar Page cuando este implementado.
export const modules: readonly ModuleDefinition[] = [
  { path: 'panel', title: 'Panel', description: 'Indicadores del día y pendientes de atención.', icon: LayoutDashboard,Page:PanelPage },
  { path: 'pacientes', title: 'Pacientes', description: 'Permitirá registrar, buscar y consultar las fichas de los pacientes.', icon: UserRound, Page: PacientesPage },
  { path: 'citas', title: 'Citas', description: 'Permitirá reservar, reprogramar y consultar las citas de la clínica.', icon: CalendarDays, Page: CitasPage },
  { path: 'historias-clinicas', title: 'Historias clínicas', label: 'Historias', description: 'Permitirá consultar antecedentes, evoluciones y odontogramas por paciente.', icon: ClipboardList, Page: HistoriasClinicasPage },
  { path: 'tratamientos', title: 'Tratamientos', description: 'Catálogo, precios y presupuestos por paciente.', icon: Stethoscope, Page: TratamientosPage },
  { path: 'pagos', title: 'Pagos', description: 'Abonos, saldos, recibos internos y caja.', icon: WalletCards, Page: PagosPage },
  { path: 'inventario', title: 'Inventario', description: 'Insumos, existencias e historial de movimientos.', icon: Package, Page: InventarioPage },
  { path: 'reportes', title: 'Reportes', description: 'Indicadores y exportación de datos operativos y de caja.', icon: FileBarChart,Page:ReportesPage }
];

export function createModuleRoutes(definitions: readonly ModuleDefinition[]): RouteObject[] {
  return definitions.map(({ path, title, description, Page }) => ({
    path,
    element: Page ? <Page /> : <ModulePlaceholder title={title} description={description} />
  }));
}

export function createModuleNavigation(definitions: readonly ModuleDefinition[]) {
  const secciones: Record<string, string> = { panel: 'Resumen', reportes: 'Resumen', pacientes: 'Pacientes y citas', citas: 'Pacientes y citas',
    'historias-clinicas': 'Atención clínica', tratamientos: 'Atención clínica', pagos: 'Pagos', inventario: 'Inventario' };
  return definitions.map(({ path, title, label, icon, section }) => ({ to: `/${path}`, label: label ?? title, icon, section: section ?? secciones[path] ?? 'Otros' }));
}
