import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatErr } from "@/lib/api";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(form.email, form.password, form.name);
      toast.success("Welcome to An Deor!");
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
      <div className="flex items-center justify-center px-6 py-16 order-2 lg:order-1">
        <form onSubmit={onSubmit} className="w-full max-w-md card-clay p-10" data-testid="register-form">
          <h1 className="font-display text-3xl mb-2">Create explorer profile</h1>
          <p className="text-ink-700 mb-8">Level 1 starts in Grand Baie.</p>

          <Button type="button" onClick={googleSignIn} variant="outline" data-testid="register-google-btn" className="w-full rounded-full mb-6 border-ink-900/20">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24 12 12 0 0 1 8.5 3.5l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3.1 0 6 1.2 8.1 3.1l5.7-5.7A20 20 0 0 0 6.3 14.7z"/><path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.5-5.2l-6.2-5.3A12 12 0 0 1 12.7 28.4l-6.6 5.1A20 20 0 0 0 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4 5.5l6.2 5.3C41.4 35.2 44 30 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
            Sign up with Google
          </Button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-sand-300" />
            <span className="text-xs tracking-[0.2em] uppercase text-ink-700">or with email</span>
            <div className="flex-1 h-px bg-sand-300" />
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Explorer name</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="register-name-input" className="rounded-xl" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="register-email-input" className="rounded-xl" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="register-password-input" className="rounded-xl" />
            </div>
            {error && <div className="text-sunset-600 text-sm" data-testid="register-error">{error}</div>}
            <Button type="submit" disabled={busy} data-testid="register-submit-btn" className="w-full rounded-full bg-sunset-500 hover:bg-sunset-600 text-white">
              {busy ? "Creating…" : "Start exploring"}
            </Button>
          </div>

          <div className="mt-6 text-sm text-ink-700">
            Already on the trail?{" "}
            <Link to="/login" className="font-semibold text-jungle-500 hover:underline" data-testid="register-go-login">Sign in</Link>
          </div>
        </form>
      </div>

      <div className="hidden lg:block relative order-1 lg:order-2">
        <img src="https://images.pexels.com/photos/15018959/pexels-photo-15018959.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=940" alt="Mauritius snorkel" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-bl from-sunset-500/60 via-jungle-500/30 to-transparent" />
        <div className="relative z-10 p-12 lg:p-16 h-full flex flex-col justify-end text-white">
          <h2 className="font-display text-5xl leading-tight mb-3">Mo dakor.<br />Let's go.</h2>
          <p className="opacity-90 max-w-md">Join An Deor Quest — outdoor & cultural Mauritius, gamified.</p>
        </div>
      </div>
    </div>
  );
}
