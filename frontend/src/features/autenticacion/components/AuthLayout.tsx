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
        <svg className="auth-dental-mark" viewBox="0 0 220 260" fill="none" aria-hidden="true">
          <path d="M51 31c15-11 32-12 47-5 7 3 17 3 24 0 15-7 32-6 47 5 23 17 26 48 18 77-8 30-22 66-39 94-9 15-19 26-30 24-12-2-14-21-18-42-2-12-5-20-10-20s-8 8-10 20c-4 21-6 40-18 42-11 2-21-9-30-24-17-28-31-64-39-94-8-29-5-60 18-77 12-9 26-11 40-5Z" />
          <path d="M69 70c12-9 26-13 41-13s29 4 41 13" />
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
