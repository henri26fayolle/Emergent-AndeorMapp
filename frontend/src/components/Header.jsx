import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Compass, Map, Award, Gift, Trophy, Sparkles, LogOut, ShieldCheck } from "lucide-react";
import { findAvatar } from "@/lib/avatars";

const navItems = [
  { to: "/dashboard", label: "Map", icon: Map },
  { to: "/tours", label: "Tours", icon: Compass },
  { to: "/quests", label: "Quests", icon: Award },
  { to: "/badges", label: "Collection", icon: Sparkles },
  { to: "/rewards", label: "Rewards", icon: Gift },
  { to: "/leaderboard", label: "Top 20", icon: Trophy },
  { to: "/companion", label: "Ti Dodo", icon: Sparkles },
];

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const avatarMeta = user?.avatar ? findAvatar(user.avatar) : null;
  const AvatarIcon = avatarMeta?.icon;

  return (
    <header data-testid="app-header" className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center gap-8">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2" data-testid="brand-link">
          <div className="w-9 h-9 rounded-2xl bg-jungle-500 flex items-center justify-center text-sand-100 font-display font-bold">A</div>
          <div className="font-display text-xl tracking-tight">
            An Deor <span className="text-sunset-500">·</span> Quest
          </div>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-1 ml-6">
            {navItems.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                data-testid={`nav-${it.label.toLowerCase().replace(/\s/g, "-")}`}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 ${
                    isActive ? "bg-jungle-500 text-white" : "text-ink-900 hover:bg-sand-200"
                  }`
                }
              >
                <it.icon className="w-4 h-4" />
                {it.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3">
          {!user ? (
            <>
              <Button variant="ghost" onClick={() => navigate("/login")} data-testid="header-login-btn" className="rounded-full">
                Sign in
              </Button>
              <Button onClick={() => navigate("/register")} data-testid="header-signup-btn" className="rounded-full bg-jungle-500 hover:bg-jungle-600 text-white">
                Start the quest
              </Button>
            </>
          ) : (
            <>
              <div className="hidden sm:flex items-center gap-2 chip" data-testid="header-xp-chip">
                <span className="text-sun-600">XP</span>
                <span className="text-ink-900">{user.xp}</span>
                <span className="text-ink-700">· Lv {user.level}</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger data-testid="header-avatar-trigger">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ring-2 ring-jungle-500/20 hover:ring-jungle-500/50 transition ${avatarMeta ? `bg-gradient-to-br ${avatarMeta.gradient} text-white` : "bg-sunset-500 text-white"}`}>
                    {AvatarIcon ? (
                      <AvatarIcon className="w-5 h-5" />
                    ) : user.picture ? (
                      <img src={user.picture} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold">{(user.name || user.email).slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-display">{user.name || user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {user.role === "admin" && (
                    <DropdownMenuItem onClick={() => navigate("/admin")} data-testid="menu-admin">
                      <ShieldCheck className="w-4 h-4 mr-2" /> Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate("/rewards")} data-testid="menu-rewards">
                    <Gift className="w-4 h-4 mr-2" /> My rewards
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await logout(); navigate("/"); }} data-testid="menu-logout">
                    <LogOut className="w-4 h-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
