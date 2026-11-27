import { useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { connectionUnavailableEvent, isConnectionUnavailable } from '@/shared/lib/apiClient';

type ConnectionStatusOverlayProps = {
  forceVisible?: boolean;
  onAction?: () => void;
};

function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

export function ConnectionStatusOverlay({ forceVisible = false, onAction }: ConnectionStatusOverlayProps) {
  const [connectionState, setConnectionState] = useState<'online' | 'offline' | 'unavailable'>(() => !isOnline() ? 'offline' : isConnectionUnavailable() ? 'unavailable' : 'online');

  useEffect(() => {
    const markOnline = () => { setConnectionState((state) => state === 'offline' ? 'online' : state); };
    const markOffline = () => { setConnectionState('offline'); };
    const markUnavailable = () => { setConnectionState('unavailable'); };
    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);
    window.addEventListener(connectionUnavailableEvent, markUnavailable);
    return () => {
      window.removeEventListener('online', markOnline);
      window.removeEventListener('offline', markOffline);
      window.removeEventListener(connectionUnavailableEvent, markUnavailable);
    };
  }, []);

  if (connectionState === 'online' && !forceVisible) return null;

  return (
    <section className="connection-overlay" role="alertdialog" aria-modal="true" aria-labelledby="connection-title">
      <div className="connection-card">
        <span className="connection-icon" aria-hidden="true"><WifiOff size={30} /></span>
        <h1 id="connection-title">Sin conexión con Dental System</h1>
        <p>No pudimos conectar con el servidor. Revisa tu conexión a internet y vuelve a intentarlo.</p>
        <button className="primary-button connection-retry-button" type="button" onClick={() => { if (onAction) onAction(); else window.location.reload(); }}>
          <RefreshCw size={17} aria-hidden="true" />Reintentar
        </button>
      </div>
    </section>
  );
}
