import { useId } from 'react';
import type { Resumen } from '../useBiReport';

export const appointmentStates = [
  { key: 'programadas', label: 'Programadas', color: '#177f81' },
  { key: 'confirmadas', label: 'Confirmadas', color: '#668aa6' },
  { key: 'atendidas', label: 'Atendidas', color: '#3d8e73' },
  { key: 'canceladas', label: 'Canceladas', color: '#b28763' },
  { key: 'inasistencias', label: 'No asistió', color: '#9c7380' }
];

type Point = { x: number; y: number };
function curve(points: Point[]) {
  return points.map((p, i) => {
    if (!i) return `M${p.x},${p.y}`;
    const before = points[i - 1], middle = (p.x + before.x) / 2;
    return `C${middle},${before.y} ${middle},${p.y} ${p.x},${p.y}`;
  }).join(' ');
}
export function ActivityChart({ series, onSelect }: { series: Resumen['series']; onSelect: (key: string) => void }) {
  const gradient = useId().replace(/:/g, '');
  const max = Math.max(1, ...series.flatMap((d) => [d.pacientes, d.citas]));
  const ceiling = Math.max(4, Math.ceil(max / 4) * 4), left = 42, bottom = 188, top = 16, right = 856;
  const points = (key: 'pacientes' | 'citas') => series.map((d, i) => ({ x: series.length === 1 ? (left + right) / 2 : left + i / (series.length - 1) * (right - left), y: bottom - d[key] / ceiling * (bottom - top) }));
  const patients = points('pacientes'), appointments = points('citas');
  return <div className="dashboard-chart-body">
    {!series.length ? <p className="dashboard-empty">Sin actividad disponible para este periodo.</p> : <>
      <div className="dashboard-chart-scroll"><svg className="dashboard-line-chart" viewBox="0 0 900 230" role="group" aria-label="Actividad diaria">
        <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#177f81" stopOpacity=".18"/><stop offset="100%" stopColor="#177f81" stopOpacity=".015"/></linearGradient></defs>
        {Array.from({ length: 5 }, (_, i) => { const y = top + i * (bottom - top) / 4; return <g key={i}><line x1={left} y1={y} x2={right} y2={y} stroke="#eef0f5"/><text x="30" y={y + 4} textAnchor="end" className="dashboard-chart-tick">{ceiling - i * ceiling / 4}</text></g>; })}
        {patients.length > 1 && <path d={`${curve(patients)} L${right},${bottom} L${left},${bottom} Z`} fill={`url(#${gradient})`}/>}
        <path d={curve(appointments)} fill="none" stroke="#8ca2b1" strokeWidth="2" strokeDasharray="5 5"/>
        <path d={curve(patients)} fill="none" stroke="#177f81" strokeWidth="2.5"/>
        {series.map((d, i) => <g key={d.fecha}>
          {(i % Math.max(1, Math.ceil(series.length / 7)) === 0 || i === series.length - 1) && <text x={patients[i].x} y="217" textAnchor="middle" className="dashboard-chart-tick">{d.fecha.slice(8)}/{d.fecha.slice(5, 7)}</text>}
          {(['pacientes', 'citas'] as const).map((key) => {
            const p = key === 'pacientes' ? patients[i] : appointments[i], metric = `${key === 'pacientes' ? 'nuevos' : 'citas'}_${d.fecha}`;
            return <circle key={key} cx={p.x} cy={p.y} r="5" fill={key === 'pacientes' ? '#177f81' : '#8ca2b1'} stroke="white" strokeWidth="2" role="button" tabIndex={0} aria-label={`${d.fecha}: ${d[key]} ${key === 'pacientes' ? 'nuevos pacientes' : 'citas'}`} onClick={() => onSelect(metric)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(metric); } }}><title>{d.fecha}: {d[key]} {key === 'pacientes' ? 'pacientes nuevos' : 'citas previstas'}</title></circle>;
          })}
        </g>)}
      </svg></div>
      <p className="dashboard-caption">{series.length === 1 ? 'Un día en el periodo. Amplía las fechas para comparar la actividad.' : 'Selecciona un punto para consultar los registros de ese día.'}</p>
    </>}
  </div>;
}
