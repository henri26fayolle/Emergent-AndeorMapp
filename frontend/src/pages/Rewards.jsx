import { useEffect, useState } from "react";
import { api, formatErr } from "@/lib/api";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Gift, Copy, Sparkles } from "lucide-react";

export default function Rewards() {
  const [rewards, setRewards] = useState([]);

  const load = async () => {
    const { data } = await api.get("/me/rewards");
    setRewards(data);
  };
  useEffect(() => { load(); }, []);

  const copy = async (code) => {
    try { await navigator.clipboard.writeText(code); toast.success(`Code copied: ${code}`); } catch { toast.error("Copy failed"); }
  };
  const redeem = async (id) => {
    try { await api.post(`/me/rewards/${id}/redeem`); toast.success("Marked as redeemed"); load(); }
    catch (e) { toast.error(formatErr(e.response?.data?.detail) || e.message); }
  };

  return (
    <div className="min-h-screen paper-bg">
      <Header />
      <main className="max-w-5xl mx-auto px-6 lg:px-10 py-12">
        <div className="mb-10">
          <span className="chip">Rewards</span>
          <h1 className="font-display text-4xl lg:text-5xl mt-3">Your perks vault</h1>
          <p className="text-ink-700 mt-2">Discounts on next tours and partner goodies. Earned by exploring.</p>
        </div>

        {rewards.length === 0 ? (
          <Card className="card-clay p-12 text-center" data-testid="rewards-empty">
            <Sparkles className="w-12 h-12 mx-auto text-sunset-500 mb-4" />
            <h3 className="font-display text-2xl mb-2">No rewards yet</h3>
            <p className="text-ink-700">Complete tours to unlock discounts and partner goodies.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {rewards.map((r) => (
              <Card key={r.user_reward_id} className="card-clay p-6 relative overflow-hidden" data-testid={`reward-${r.user_reward_id}`}>
                <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-sunset-500/10" />
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${r.type === "discount" ? "bg-jungle-500 text-white" : "bg-sun-500 text-ink-900"}`}>
                    <Gift className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <Badge className={`rounded-full mb-2 ${r.type === "discount" ? "bg-jungle-500" : "bg-sunset-500"} text-white`}>{r.type}</Badge>
                    <h3 className="font-display text-xl">{r.title}</h3>
                    <p className="text-sm text-ink-700">{r.description}</p>
                    <div className="text-xs tracking-[0.2em] uppercase text-ink-700 mt-2">Partner · {r.partner}</div>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2">
                  <div className="flex-1 font-mono text-base tracking-wider bg-sand-100 border border-dashed border-ink-900/20 rounded-2xl px-4 py-3" data-testid={`reward-code-${r.user_reward_id}`}>
                    {r.code}
                  </div>
                  <Button variant="outline" size="icon" onClick={() => copy(r.code)} data-testid={`reward-copy-${r.user_reward_id}`} className="rounded-full"><Copy className="w-4 h-4" /></Button>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  {r.redeemed ? <Badge className="rounded-full bg-jungle-500 text-white">Redeemed</Badge> : <Badge variant="outline" className="rounded-full">Active</Badge>}
                  {!r.redeemed && <Button size="sm" onClick={() => redeem(r.user_reward_id)} data-testid={`reward-redeem-${r.user_reward_id}`} className="rounded-full bg-sunset-500 hover:bg-sunset-600 text-white">Mark redeemed</Button>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
