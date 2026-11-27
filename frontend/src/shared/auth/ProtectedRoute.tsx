import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { LogOut, RefreshCw, WifiOff } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { SessionLoadingScreen } from '../components/SessionLoadingScreen';
import { BrandLogo } from '../components/BrandLogo';

export function SessionStatus() {
  const { loading, error, retry, signOut } = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  if (loading) return <SessionLoadingScreen />;
  return <main className="session-problem-page">
    <section className="session-problem-card" aria-label="Estado de sesión">
      <BrandLogo className="session-problem-brand" />
      <div className="session-problem-icon" aria-hidden="true"><WifiOff size={29} /></div>
      <div className="session-problem-copy"><p className="eyebrow">Conexión segura</p><h1>Revisa tu conexión</h1>
        <p role="alert">{signOutError ?? error ?? 'No pudimos verificar tu sesión. Comprueba tu conexión e inténtalo nuevamente.'}</p></div>
        <div className="session-problem-actions">
          <button className="primary-button button-icon" onClick={retry}><RefreshCw size={17} aria-hidden="true" />Reintentar</button>
          <button className="secondary-button" onClick={() => {
            void signOut().catch((cause: Error) => setSignOutError(cause.message));
          }}><LogOut size={17} aria-hidden="true" />Cerrar sesión</button>
        </div>
      <p className="session-problem-help">Verifica tu conexión a internet y vuelve a intentarlo.</p>
    </section>
  </main>;
}

export function ProtectedRoute() {
  const { session, user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <SessionStatus />;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  if (!user) return <SessionStatus />;
  return <Outlet />;
}
