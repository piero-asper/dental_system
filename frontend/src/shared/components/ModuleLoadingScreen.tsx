import { BrandLogo } from './BrandLogo';

export function ModuleLoadingScreen({ moduleName }: { moduleName: string }) {
  return <section className="module-loading" role="status" aria-live="polite" aria-label={`Cargando ${moduleName}`}>
    <div className="module-loading-content">
      <div className="module-loading-emblem" aria-hidden="true"><span className="module-loading-ring module-loading-ring-track" /><span className="module-loading-ring module-loading-ring-progress" /><BrandLogo className="module-loading-logo" /></div>
      <div><h1>Preparando {moduleName}</h1><p>Estamos cargando la información de la clínica.</p></div>
    </div>
  </section>;
}
