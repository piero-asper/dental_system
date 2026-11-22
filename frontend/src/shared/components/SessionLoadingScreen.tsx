import { BrandLogo } from './BrandLogo';

type SessionLoadingScreenProps = {
  title?: string;
  description?: string;
};

export function SessionLoadingScreen({
  title = 'Verificando tu sesión',
  description = 'Estamos validando tu acceso seguro a Dental System.'
}: SessionLoadingScreenProps) {
  return (
    <main className="session-loading" aria-live="polite" aria-busy="true">
      <section className="session-loading-content" role="status" aria-label={title}>
        <div className="session-loading-emblem" aria-hidden="true">
          <span className="session-loading-ring session-loading-ring-track" />
          <span className="session-loading-ring session-loading-ring-progress" />
          <BrandLogo className="session-loading-logo" />
        </div>
        <div className="session-loading-copy">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>
    </main>
  );
}
