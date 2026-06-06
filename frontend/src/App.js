import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "@/App.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import Tours from "@/pages/Tours";
import Quests from "@/pages/Quests";
import Badges from "@/pages/Badges";
import Rewards from "@/pages/Rewards";
import Leaderboard from "@/pages/Leaderboard";
import Companion from "@/pages/Companion";
import Admin from "@/pages/Admin";

function AppRouter() {
  const location = useLocation();
  // Capture Emergent Google OAuth callback synchronously before any route check
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/tours" element={<ProtectedRoute><Tours /></ProtectedRoute>} />
      <Route path="/quests" element={<ProtectedRoute><Quests /></ProtectedRoute>} />
      <Route path="/badges" element={<ProtectedRoute><Badges /></ProtectedRoute>} />
      <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="/companion" element={<ProtectedRoute><Companion /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute admin><Admin /></ProtectedRoute>} />
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
