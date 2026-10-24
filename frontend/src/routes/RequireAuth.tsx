import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';

export function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const { tr } = useUi();
  const location = useLocation();
  if (isLoading) {
    return (
      <p role="status" style={{ padding: 32, textAlign: 'center', color: 'var(--color-muted)' }}>
        {tr('ஏற்றுகிறது…', 'Loading…')}
      </p>
    );
  }
  if (!isAuthenticated) return <Navigate to="/welcome" replace state={{ from: location }} />;
  return <Outlet />;
}
