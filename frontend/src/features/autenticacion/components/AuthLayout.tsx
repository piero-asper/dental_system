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
          <path d="M47 31C76 6 103 25 110 25s34-19 63 6c30 26 25 71 14 101-12 33-23 69-45 96-12 15-25 15-32-4l-10-37-10 37c-7 19-20 19-32 4-22-27-33-63-45-96C22 102 17 57 47 31Z" />
          <path d="M72 66c12-10 24-13 38-13s26 3 38 13" />
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
