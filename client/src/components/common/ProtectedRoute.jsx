import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

/**
 * Wraps protected pages.
 * - While auth state is loading → show spinner (prevents flash)
 * - Not authenticated → redirect to /login
 * - Role restriction provided → check user role
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, loading, isAuthenticated } = useSelector((state) => state.auth);
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg-base)" }}>
        <div
          className="btn-spinner"
          style={{ width: 32, height: 32, borderWidth: 3, borderColor: "var(--bg-elevated)", borderTopColor: "var(--accent)" }}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Redirect to the correct dashboard for this user's role
    return <Navigate to="/" replace />;
  }

  return children;
}
