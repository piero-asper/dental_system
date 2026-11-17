export type ListaPaginada<T> = { items: T[]; total: number; pagina: number; tamanoPagina: number; totalPaginas: number };
export function ListaPaginacion({ pagina, totalPaginas, onChange }: { pagina: number; totalPaginas: number; onChange: (page: number) => void }) {
  if (totalPaginas <= 1 && pagina === 1) return null;
  return <nav className="pagination" aria-label="Paginación">
    <button className="secondary-button" disabled={pagina <= 1} onClick={() => onChange(pagina - 1)}>Anterior</button>
    <span>Página {pagina} de {Math.max(1, totalPaginas)}</span>
    <button className="secondary-button" disabled={pagina >= totalPaginas} onClick={() => onChange(pagina + 1)}>Siguiente</button>
  </nav>;
}
