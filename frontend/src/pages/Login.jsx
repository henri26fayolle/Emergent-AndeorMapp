import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Sparkles } from "lucide-react";
import { startAndeorAuthPopup } from "@/lib/andeorAuthPopup";
import { useAuth } from "@/contexts/AuthContext";

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.6-.2-2.3H12v4.4h5.9c-.3 1.4-1.1 2.5-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.7 3.3-8.1Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1-3.7 1-2.8 0-5.2-1.9-6.1-4.5H2.2v2.8C4 20.5 7.7 23 12 23Z" />
      <path fill="#FBBC05" d="M5.9 14.1c-.2-.7-.4-1.4-.4-2.1s.1-1.4.4-2.1V7.1H2.2A11 11 0 0 0 1 12c0 1.8.4 3.5 1.2 4.9l3.7-2.8Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A10.8 10.8 0 0 0 12 1C7.7 1 4 3.5 2.2 7.1l3.7 2.8c.9-2.6 3.3-4.5 6.1-4.5Z" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [connecting, setConnecting] = useState(false);

  const continueWithAndeor = (mode, provider = "google") => {
    setConnecting(true);
    startAndeorAuthPopup({
      mode,
      provider,
      onSuccess: async () => {
        try {
          const nextUser = await refresh();
          navigate(nextUser?.tutorial_completed ? "/dashboard" : "/onboarding", { replace: true });
        } finally {
          setConnecting(false);
        }
      },
      onError: () => setConnecting(false),
      onCancel: () => setConnecting(false),
    });
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
        <div className="w-full max-w-md card-clay p-10" data-testid="login-form">
          <h1 className="font-display text-3xl mb-2">Sign in</h1>
          <p className="text-ink-700 mb-8">Use your Andeor account to continue your Mauritius quest.</p>

          <div className="space-y-3">
            <Button type="button" disabled={connecting} onClick={() => continueWithAndeor("login", "google")} data-testid="login-google-btn" className="w-full rounded-2xl bg-white text-ink-900 border border-ink-900/10 hover:bg-sand-50 justify-start h-auto py-4 disabled:opacity-70">
              <span className="mr-3 grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm border border-ink-900/10">
                <GoogleMark />
              </span>
              <span className="text-left">
                <span className="block font-display text-lg">{connecting ? "Connecting Google..." : "Continue with Google"}</span>
                <span className="block text-xs font-normal text-ink-700">Connect without leaving the adventure map.</span>
              </span>
            </Button>

            <Button type="button" disabled={connecting} onClick={() => continueWithAndeor("signup", "google")} data-testid="login-signup-btn" className="w-full rounded-2xl bg-jungle-500 hover:bg-jungle-600 text-white justify-start h-auto py-4 disabled:opacity-70">
              <Sparkles className="mr-3 h-5 w-5" />
              <span className="text-left">
                <span className="block font-display text-lg">Sign up with Google</span>
                <span className="block text-xs font-normal text-sand-100/80">Create a new Andeor account.</span>
              </span>
            </Button>

            <Button type="button" disabled={connecting} onClick={() => continueWithAndeor("login", "google")} data-testid="login-andeor-btn" variant="outline" className="w-full rounded-2xl justify-start h-auto py-4 disabled:opacity-70">
              <LogIn className="mr-3 h-5 w-5" />
              <span className="text-left">
                <span className="block font-display text-lg">Log in with Google</span>
                <span className="block text-xs font-normal text-ink-700">Already have an Andeor account.</span>
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
