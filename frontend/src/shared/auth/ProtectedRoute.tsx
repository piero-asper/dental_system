import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from './AuthProvider';

export function SessionStatus() {
  const { loading, error, retry, signOut } = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  return <main className="login-page">
    <section className="login-panel" aria-label="Estado de sesión">
      {loading ? <p role="status">Verificando tu sesión…</p> : <>
        <h1>Revisa tu conexión</h1>
        <p role="alert">{signOutError ?? error}</p>
        <div className="session-actions">
          <button className="primary-button" onClick={retry}>Reintentar</button>
          <button className="secondary-button" onClick={() => {
            void signOut().catch((cause: Error) => setSignOutError(cause.message));
          }}>Cerrar sesión</button>
        </div>
      </>}
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
