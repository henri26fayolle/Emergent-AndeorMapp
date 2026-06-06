import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import RpgHud from "@/components/RpgHud";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { findAvatar } from "@/lib/avatars";
import { Trophy, Medal, Crown } from "lucide-react";

const rankIcon = (i) => (i === 0 ? Crown : i === 1 ? Trophy : Medal);
const rankColor = (i) => (i === 0 ? "text-sun-500" : i === 1 ? "text-sunset-500" : "text-ocean-500");

export default function Leaderboard({ embedded = false }) {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/leaderboard").then((r) => setRows(r.data)); }, []);

  const inner = (
    <main className={embedded ? "relative" : "relative max-w-3xl mx-auto px-6 lg:px-10 py-10 lg:py-14 pb-44 pr-20"}>
        <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <span className="chip"><Trophy className="w-3 h-3" /> Hall of explorers</span>
          <h1 className="font-display text-4xl lg:text-5xl mt-3 italic">Top of Mauritius</h1>
          <p className="text-ink-700 mt-2 text-sm">Highest XP across all An Deor adventurers.</p>
        </motion.header>

        <Card className="card-clay p-3" data-testid="leaderboard-card">
          {rows.length === 0 && <div className="text-center py-12 text-ink-700">No rankings yet — be the first.</div>}
          <ul>
            {rows.map((u, i) => {
              const Icon = rankIcon(i);
              const meta = u.avatar ? findAvatar?.(u.avatar) : null;
              const AvatarIcon = meta?.icon;
              return (
                <motion.li
                  key={u.user_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center gap-4 p-4 rounded-2xl ${i === 0 ? "bg-sun-500/15" : i < 3 ? "bg-sand-100" : ""}`}
                  data-testid={`leader-row-${i}`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${i < 3 ? "bg-white shadow-clay" : "bg-sand-200"}`}>
                    {i < 3 ? <Icon className={`w-6 h-6 ${rankColor(i)}`} /> : <span className="font-display text-lg text-ink-700">{i + 1}</span>}
                  </div>
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 ${meta ? `bg-gradient-to-br ${meta.gradient}` : "bg-jungle-700"}`}>
                    {AvatarIcon ? <AvatarIcon className="w-5 h-5" /> : <span className="text-xs font-bold">{(u.name || "X").slice(0, 2).toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display italic truncate">{u.name || "Explorer"}</div>
                    <div className="text-xs text-ink-700">{meta?.name || "Explorer"} · Lv {u.level}</div>
                  </div>
                  <Badge className="rounded-full bg-jungle-700 text-sand-100 tabular-nums">{u.xp} XP</Badge>
                </motion.li>
              );
            })}
          </ul>
        </Card>
      </main>
  );

  if (embedded) return inner;
  return (
    <div className="min-h-screen relative overflow-x-hidden bg-jungle-700">
      <div className="absolute inset-0 paper-bg" />
      <RpgHud />
      {inner}
    </div>
  );
}
