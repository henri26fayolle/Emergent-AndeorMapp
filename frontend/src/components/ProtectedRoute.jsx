import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children, admin = false }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center paper-bg">
        <div className="font-display text-xl text-jungle-500 animate-pulse">Loading the lagoon…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  // Onboarding gate — admins and tutorial-completed users pass; others go through Prologue
  if (!admin && user.role !== "admin" && !user.tutorial_completed) {
    return <Navigate to="/onboarding" replace />;
  }
  if (admin && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}
