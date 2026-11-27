import { CalendarCog } from 'lucide-react';
import { AgendaConfiguracion } from '../components/AgendaConfiguracion';

export function AgendaConfiguracionPage() {
  return <section className="patients-page clinical-page agenda-settings-page">
    <header className="module-header page-header">
      <div><p className="eyebrow">Configuración de la clínica</p><h1>Horario de atención</h1><p>Configura franjas sugeridas y bloqueos cuando los necesites.</p></div>
      <span className="agenda-settings-icon" aria-hidden="true"><CalendarCog size={22} /></span>
    </header>
    <AgendaConfiguracion />
  </section>;
}
