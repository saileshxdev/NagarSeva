import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Landing from "../../pages/Landing";

/**
 * At "/":
 * - Not authenticated → show Landing page
 * - Authenticated → redirect to role-specific dashboard
 */
export default function RoleRedirect() {
  const { user, loading, isAuthenticated } = useSelector((state) => state.auth);

  if (loading) return null;
  if (!isAuthenticated) return <Landing />;

  switch (user?.role) {
    case "SUPER_ADMIN":
      return <Navigate to="/superadmin" replace />;
    case "ADMIN":
      return <Navigate to="/admin" replace />;
    case "FIELD_WORKER":
      return <Navigate to="/field-worker" replace />;
    case "CITIZEN":
    default:
      return <Navigate to="/citizen" replace />;
  }
}
