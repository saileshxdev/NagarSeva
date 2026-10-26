import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setAuth, clearAuth } from "./slices/authSlice";
import { checkAuth } from "./services/Operations/authAPI";

import ProtectedRoute from "./components/common/ProtectedRoute";
import RoleRedirect from "./components/common/RoleRedirect";
import CitizenLayout from "./components/common/CitizenLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import CitizenDashboard from "./pages/CitizenDashboard";
import FieldWorker_Home from "./pages/FieldWorker_Home";
import FieldWorker_Reports from "./pages/FieldWorker_Reports";
import IssueWorkPage from "./pages/IssueWorkPage";

import ReportWizard from "./pages/ReportWizard";
import MyComplaints from "./pages/MyComplaints";
import CityPulse from "./pages/CityPulse";
import UpvotedIssues from "./pages/UpvotedIssues";
import Landing from "./pages/Landing";
import Admin_Home from "./pages/Admin_Home";
import Admin_Reports from "./pages/Admin_Reports";
import Admin_FieldWorkers from "./pages/Admin_FieldWorkers";
import Admin_Analytics from "./pages/Admin_Analytics";
import SuperAdmin_Home from "./pages/SuperAdmin_Home";
import SuperAdmin_Reports from "./pages/SuperAdmin_Reports";
import SuperAdmin_Departments from "./pages/SuperAdmin_Departments";
import SuperAdmin_Analytics from "./pages/SuperAdmin_Analytics";


export default function App() {
  const dispatch = useDispatch();

  // On mount: validate session via the httpOnly cookie (sent automatically by the browser).
  // We no longer check localStorage — auth state lives in the cookie.
  useEffect(() => {
    async function verifyUser() {
      const data = await checkAuth(); // GET /api/auth/me — cookie attached automatically
      if (data && data.user) {
        dispatch(setAuth(data.user));
      } else {
        dispatch(clearAuth());
      }
    }
    verifyUser();
  }, [dispatch]);

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login"        element={<Login />} />
      <Route path="/register"     element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Citizen routes nested under CitizenLayout */}
      <Route
        element={
          <ProtectedRoute roles={["CITIZEN"]}>
            <CitizenLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/citizen"                  element={<CitizenDashboard />} />
        <Route path="/citizen/report"           element={<ReportWizard />} />
        <Route path="/citizen/complaints"       element={<MyComplaints />} />
        <Route path="/citizen/city-pulse"       element={<CityPulse />} />
        <Route path="/citizen/upvoted"          element={<UpvotedIssues />} />
      </Route>
      <Route
        path="/field-worker"
        element={
          <ProtectedRoute roles={["FIELD_WORKER"]}>
            <FieldWorker_Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/field-worker/reports"
        element={
          <ProtectedRoute roles={["FIELD_WORKER"]}>
            <FieldWorker_Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/field-worker/issues/:id"
        element={
          <ProtectedRoute roles={["FIELD_WORKER"]}>
            <IssueWorkPage />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <Admin_Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <Admin_Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/field_workers"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <Admin_FieldWorkers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <Admin_Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute roles={["SUPER_ADMIN"]}>
            <SuperAdmin_Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/reports"
        element={
          <ProtectedRoute roles={["SUPER_ADMIN"]}>
            <SuperAdmin_Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/departments"
        element={
          <ProtectedRoute roles={["SUPER_ADMIN"]}>
            <SuperAdmin_Departments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/analytics"
        element={
          <ProtectedRoute roles={["SUPER_ADMIN"]}>
            <SuperAdmin_Analytics />
          </ProtectedRoute>
        }
      />
      <Route path="/super-admin" element={<Navigate to="/superadmin" replace />} />

      {/* Default: redirect to correct dashboard based on role */}
      <Route path="/"  element={<RoleRedirect />} />
      <Route path="*"  element={<Navigate to="/" replace />} />
    </Routes>
  );
}
