import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AdminRoute } from './components/AdminRoute';
import { DashboardPage } from './pages/DashboardPage';
import { IncapacityPage } from './pages/IncapacityPage';
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { AdminUsersPage } from './pages/AdminUsersPage';

function ProtectedRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return <Outlet />;
}

function PasswordChangeRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<PasswordChangeRoute />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route index element={<DashboardPage />} />
        <Route path="/incapacidades/:id" element={<IncapacityPage />} />
        <Route
          path="/admin/usuarios"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

