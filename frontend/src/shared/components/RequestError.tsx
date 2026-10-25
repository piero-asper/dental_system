import { errorMessage } from '../lib/clinical';
export function RequestError({ error, retry }: { error: unknown; retry?: () => void }) {
  return <div className="state-panel"><p className="form-error" role="alert">{errorMessage(error)}</p>{retry && <button type="button" className="secondary-button" onClick={retry}>Reintentar</button>}</div>;
}
