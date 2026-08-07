import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext'; // FIXED: Adjusted path depth to match context structure layout

// Added allowedRoles array parameter support to protect specific sub-paths (e.g., /analytics)
export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, loading } = useContext(AuthContext);

  // Render a full-screen loading spinner while verifying token contexts
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-semibold mt-3 tracking-wide">Securing session...</p>
      </div>
    );
  }

  // Redirect to login if user is unauthenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Enforce role-based access tokens clearance checks
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />; // Gracefully bounce unauthorized view shifts to dashboard root
  }

  // Safe signature path confirmation layout
  return <Outlet />;
}
