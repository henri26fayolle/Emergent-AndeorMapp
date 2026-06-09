import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setGameAccessToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthCallback() {
  const processed = useRef(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    if (processed.current) return;
    processed.current = true;
    const hash = window.location.hash;
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) {
      navigate("/login", { replace: true });
      return;
    }
    const session_id = m[1];
    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", { session_id });
        setGameAccessToken(data.token);
        setUser(data.user);
        window.history.replaceState({}, "", "/dashboard");
        navigate("/dashboard", { replace: true, state: { user: data.user } });
      } catch (e) {
        setError("Google sign-in failed. Please try again.");
        setTimeout(() => navigate("/login", { replace: true }), 2500);
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center paper-bg">
      <div className="text-center">
        <div className="font-display text-2xl text-jungle-500 mb-2">Welcoming you to An Deor…</div>
        {error && <div className="text-sunset-500">{error}</div>}
      </div>
    </div>
  );
}
