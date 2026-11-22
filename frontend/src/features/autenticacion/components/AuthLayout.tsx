import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/shared/components/BrandLogo';

type AuthLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({ eyebrow, title, description, children, footer }: AuthLayoutProps) {
  return (
    <main className="login-page">
      <section className="auth-showcase" aria-label="Dental System">
        <span className="auth-orbit auth-orbit-top" aria-hidden="true" />
        <span className="auth-orbit auth-orbit-bottom" aria-hidden="true" />
        <svg className="auth-dental-mark" viewBox="0 0 160 150" fill="none" aria-hidden="true">
          <path d="M80 27c-8-6-17-9-26-7-13 3-20 14-19 29 1 17 10 29 15 45l9 31c2 8 7 14 13 14 8 0 9-12 11-25 2-13 4-22 8-22s6 9 8 22c2 13 3 25 11 25 6 0 11-6 13-14l9-31c5-16 14-28 15-45 1-15-6-26-19-29-9-2-18 1-26 7-6 5-14 5-20 0Z" />
        </svg>
        <BrandLogo inverse />
        <div className="auth-showcase-copy">
          <p className="auth-kicker">Gestión odontológica</p>
          <h1>Tu clínica dental,<br /><em>cerca</em> de cada<br />sonrisa.</h1>
          <p>Pacientes, agenda, tratamientos e historial clínico reunidos en un espacio pensado para tu consulta.</p>
        </div>
        <aside className="auth-security-card"><span><ShieldCheck size={20} aria-hidden="true" /></span><div><strong>Información clínica segura</strong><p>Accede de forma protegida a los datos de tu clínica.</p></div></aside>
      </section>
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-panel-heading">
          <p className="eyebrow">{eyebrow}</p>
          <h2 id="login-title">{title}</h2>
          <p>{description}</p>
        </div>
        {children}
        {footer && <footer className="login-panel-footer">{footer}</footer>}
      </section>
    </main>
  );
}
