import { BrowserRouter, HashRouter, Routes, Route, useLocation } from "react-router-dom";
import "@/App.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";
import Prologue from "@/pages/Prologue";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import Tours from "@/pages/Tours";
import Quests from "@/pages/Quests";
import Badges from "@/pages/Badges";
import Rewards from "@/pages/Rewards";
import Leaderboard from "@/pages/Leaderboard";
import Companion from "@/pages/Companion";
import Admin from "@/pages/Admin";
import MainQuests from "@/pages/MainQuests";

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Prologue />} />
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Prologue />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/tours" element={<ProtectedRoute><Tours /></ProtectedRoute>} />
      <Route path="/main-quests" element={<ProtectedRoute><MainQuests /></ProtectedRoute>} />
      <Route path="/quests" element={<ProtectedRoute><Quests /></ProtectedRoute>} />
      <Route path="/badges" element={<ProtectedRoute><Badges /></ProtectedRoute>} />
      <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="/companion" element={<ProtectedRoute><Companion /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute admin><Admin /></ProtectedRoute>} />
      <Route path="*" element={<Prologue />} />
    </Routes>
  );
}

function App() {
  const Router = process.env.REACT_APP_ROUTER_MODE === "hash" ? HashRouter : BrowserRouter;

  return (
    <Router>
      <AuthProvider>
        <LanguageProvider>
          <AppRouter />
          <Toaster position="top-center" richColors />
        </LanguageProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
