import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Crown } from "lucide-react";

const rankIcon = (i) => (i === 0 ? Crown : i === 1 ? Trophy : Medal);
const rankColor = (i) => (i === 0 ? "text-sun-500" : i === 1 ? "text-sunset-500" : "text-ocean-500");

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/leaderboard").then((r) => setRows(r.data)); }, []);

  return (
    <div className="min-h-screen paper-bg">
      <Header />
      <main className="max-w-3xl mx-auto px-6 lg:px-10 py-12">
        <div className="mb-10">
          <span className="chip">Top 20</span>
          <h1 className="font-display text-4xl lg:text-5xl mt-3">Mauritius explorers</h1>
          <p className="text-ink-700 mt-2">Highest XP across An Deor Quest.</p>
        </div>

        <Card className="card-clay p-2" data-testid="leaderboard-card">
          {rows.length === 0 && <div className="text-center py-12 text-ink-700">No rankings yet — be the first.</div>}
          <ul>
            {rows.map((u, i) => {
              const Icon = rankIcon(i);
              return (
                <li key={u.user_id} className={`flex items-center gap-4 p-4 rounded-2xl ${i === 0 ? "bg-sun-500/10" : i < 3 ? "bg-sand-100" : ""}`} data-testid={`leader-row-${i}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${i < 3 ? "bg-white shadow-clay" : "bg-sand-200"}`}>
                    {i < 3 ? <Icon className={`w-5 h-5 ${rankColor(i)}`} /> : <span className="font-display text-ink-700">{i + 1}</span>}
                  </div>
                  <Avatar>
                    <AvatarImage src={u.picture} />
                    <AvatarFallback className="bg-jungle-500 text-white">{(u.name || "X").slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold">{u.name || "Explorer"}</div>
                    <div className="text-xs text-ink-700">Level {u.level}</div>
                  </div>
                  <Badge className="rounded-full bg-jungle-500 text-white tabular-nums">{u.xp} XP</Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      </main>
    </div>
  );
}
