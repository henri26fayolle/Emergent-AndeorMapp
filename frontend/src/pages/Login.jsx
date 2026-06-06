import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatErr } from "@/lib/api";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      toast.success("Welcome back, explorer.");
      navigate("/dashboard");
    } catch (e) {
      setError(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const googleSignIn = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 paper-bg">
      <div className="hidden lg:block relative">
        <img src="https://images.pexels.com/photos/7415730/pexels-photo-7415730.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=940" alt="Mauritius lagoon" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-tr from-jungle-700/80 via-jungle-500/40 to-transparent" />
        <div className="relative z-10 p-12 lg:p-16 h-full flex flex-col justify-end text-white">
          <Link to="/" className="font-display text-2xl mb-auto" data-testid="login-brand">An Deor · Quest</Link>
          <h2 className="font-display text-5xl leading-tight mb-3">Bienveni back<br />to paradise.</h2>
          <p className="opacity-80 max-w-md">Pick up the trail where you left off and unlock the next region of Mauritius.</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <form onSubmit={onSubmit} className="w-full max-w-md card-clay p-10" data-testid="login-form">
          <h1 className="font-display text-3xl mb-2">Sign in</h1>
          <p className="text-ink-700 mb-8">Continue your Mauritius quest.</p>

          <Button type="button" onClick={googleSignIn} variant="outline" data-testid="login-google-btn" className="w-full rounded-full mb-6 border-ink-900/20">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24 12 12 0 0 1 8.5 3.5l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3.1 0 6 1.2 8.1 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7z"/><path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.5-5.2l-6.2-5.3A12 12 0 0 1 12.7 28.4l-6.6 5.1A20 20 0 0 0 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.5l6.2 5.3C41.4 35.2 44 30 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-sand-300" />
            <span className="text-xs tracking-[0.2em] uppercase text-ink-700">or</span>
            <div className="flex-1 h-px bg-sand-300" />
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email-input" className="rounded-xl" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password-input" className="rounded-xl" />
            </div>
            {error && <div className="text-sunset-600 text-sm" data-testid="login-error">{error}</div>}
            <Button type="submit" disabled={busy} data-testid="login-submit-btn" className="w-full rounded-full bg-jungle-500 hover:bg-jungle-600 text-white">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </div>

          <div className="mt-6 text-sm text-ink-700">
            New explorer?{" "}
            <Link to="/register" className="font-semibold text-sunset-500 hover:underline" data-testid="login-go-register">Create an account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
