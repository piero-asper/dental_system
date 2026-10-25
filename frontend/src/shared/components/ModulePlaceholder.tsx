import { Construction } from 'lucide-react';

type ModulePlaceholderProps = {
  title: string;
  description: string;
};

export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <section className="module-page construction-page">
      <header className="module-header">
        <p className="eyebrow">Módulo</p>
        <h1>{title}</h1>
      </header>
      <div className="construction-notice surface">
        <span className="construction-icon" aria-hidden="true"><Construction size={24} strokeWidth={1.7} /></span>
        <div className="construction-copy">
          <h2>Pantalla en Construccion</h2>
          <p>{description}</p>
        </div>
      </div>
    </section>
  );
}

