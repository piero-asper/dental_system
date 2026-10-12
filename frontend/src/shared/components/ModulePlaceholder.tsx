type ModulePlaceholderProps = {
  title: string;
  description: string;
};

export function ModulePlaceholder({ title, description }: ModulePlaceholderProps) {
  return (
    <section className="module-page">
      <header className="module-header">
        <p className="eyebrow">Modulo</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
    </section>
  );
}

