import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Ruta protegida que solo permite acceso a usuarios con rol ADMIN.
 * Los demás roles son redirigidos al dashboard principal.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}
