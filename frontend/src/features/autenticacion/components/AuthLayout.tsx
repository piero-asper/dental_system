import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { BrandLogo } from '@/shared/components/BrandLogo';

type AuthLayoutProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  loginNotice?: ReactNode;
  panelClassName?: string;
};

export function AuthLayout({ eyebrow, title, description, children, footer, loginNotice, panelClassName }: AuthLayoutProps) {
  return (
    <main className="login-page">
      <section className="auth-showcase" aria-label="Dental System">
        <span className="auth-orbit auth-orbit-top" aria-hidden="true" />
        <span className="auth-orbit auth-orbit-bottom" aria-hidden="true" />
        <BrandLogo inverse />
        <div className="auth-showcase-copy">
          <p className="auth-kicker">Gestión odontológica</p>
          <h1>Tu clínica dental,<br /><em>cerca</em> de cada<br />sonrisa.</h1>
          <p>Pacientes, agenda, tratamientos e historial clínico reunidos en un espacio pensado para tu consulta.</p>
          <aside className="auth-security-card"><span><ShieldCheck size={20} aria-hidden="true" /></span><div><strong>Información clínica segura</strong><p>Accede de forma protegida a los datos de tu clínica.</p></div></aside>
        </div>
      </section>
      <section className={`login-panel ${panelClassName ?? ''}`.trim()} aria-labelledby="login-title">
        <div className="login-panel-heading">
          <p className="eyebrow">{eyebrow}</p>
          <h2 id="login-title">{title}</h2>
          <p>{description}</p>
        </div>
        {children}
        {footer && <footer className="login-panel-footer">{footer}</footer>}
      </section>
      {loginNotice && <div className="login-page-notice">{loginNotice}</div>}
    </main>
  );
}
