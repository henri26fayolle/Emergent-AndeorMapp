import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api, formatErr } from "@/lib/api";
import RpgHud from "@/components/RpgHud";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Gift, Copy, Sparkles } from "lucide-react";

export default function Rewards({ embedded = false }) {
  const [rewards, setRewards] = useState([]);

  const load = async () => { const { data } = await api.get("/me/rewards"); setRewards(data); };
  useEffect(() => { load(); }, []);

  const copy = async (code) => { try { await navigator.clipboard.writeText(code); toast.success(`Code copied: ${code}`); } catch { toast.error("Copy failed"); } };
  const redeem = async (id) => { try { await api.post(`/me/rewards/${id}/redeem`); toast.success("Marked as redeemed"); load(); } catch (e) { toast.error(formatErr(e.response?.data?.detail) || e.message); } };

  const inner = (
    <main className={embedded ? "relative" : "relative max-w-5xl mx-auto px-6 lg:px-10 py-10 lg:py-14 pb-44 pr-20"}>
        <motion.header initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <span className="chip"><Gift className="w-3 h-3" /> Treasure vault</span>
          <h1 className="font-display text-4xl lg:text-5xl mt-3 italic">Your spoils of adventure</h1>
          <p className="text-ink-700 mt-2 text-sm">Discount codes & partner goodies — earned, not bought.</p>
        </motion.header>

        {rewards.length === 0 ? (
          <Card className="card-clay p-12 text-center" data-testid="rewards-empty">
            <motion.div initial={{ rotate: -8, scale: 0.8, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ ease: "backOut", duration: 0.6 }}>
              <Sparkles className="w-14 h-14 mx-auto text-sunset-500 mb-4" />
            </motion.div>
            <h3 className="font-display text-2xl italic mb-2">Vault is empty</h3>
            <p className="text-ink-700">Complete quests to unlock discounts and partner goodies.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {rewards.map((r, i) => (
              <motion.div
                key={r.user_reward_id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="card-clay p-6 relative overflow-hidden" data-testid={`reward-${r.user_reward_id}`}>
                  <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-sunset-500/15" />
                  <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-sun-500/15" />
                  <div className="flex items-start gap-4 relative">
                    <motion.div
                      whileHover={{ rotate: -8, scale: 1.05 }}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${r.type === "discount" ? "bg-jungle-700 text-sand-100" : "bg-sun-500 text-ink-900"}`}
                    >
                      <Gift className="w-7 h-7" />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <Badge className={`rounded-full mb-2 ${r.type === "discount" ? "bg-jungle-700" : "bg-sunset-500"} text-white`}>{r.type}</Badge>
                      <h3 className="font-display text-xl italic">{r.title}</h3>
                      <p className="text-sm text-ink-700">{r.description}</p>
                      <div className="text-xs tracking-[0.2em] uppercase text-ink-700 mt-2">Partner · {r.partner}</div>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-2 relative">
                    <div className="flex-1 font-mono text-base tracking-wider bg-sand-100 border-2 border-dashed border-[#7A5A2B]/40 rounded-2xl px-4 py-3" data-testid={`reward-code-${r.user_reward_id}`}>
                      {r.code}
                    </div>
                    <Button variant="outline" size="icon" onClick={() => copy(r.code)} data-testid={`reward-copy-${r.user_reward_id}`} className="rounded-full"><Copy className="w-4 h-4" /></Button>
                  </div>
                  <div className="mt-4 flex items-center justify-between relative">
                    {r.redeemed ? <Badge className="rounded-full bg-jungle-500 text-white">Redeemed</Badge> : <Badge variant="outline" className="rounded-full">Active</Badge>}
                    {!r.redeemed && <Button size="sm" onClick={() => redeem(r.user_reward_id)} data-testid={`reward-redeem-${r.user_reward_id}`} className="rounded-full bg-sunset-500 hover:bg-sunset-600 text-white">Mark redeemed</Button>}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
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
