import { useEffect, useRef, useState } from "react";
import { api, formatErr } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Volume2, Save, Loader2, BookOpen, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AdminCodex() {
  const [regions, setRegions] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [regenId, setRegenId] = useState(null);

  const load = async () => {
    const r = await api.get("/regions");
    setRegions(r.data);
    const init = {};
    for (const reg of r.data) {
      init[reg.region_id] = {
        lore_title: reg.lore_title || "",
        lore_summary: reg.lore_summary || "",
        lore_text: reg.lore_text || "",
      };
    }
    setDrafts(init);
  };
  useEffect(() => { load(); }, []);

  const save = async (region_id) => {
    setSavingId(region_id);
    try {
      await api.patch(`/codex/admin/region/${region_id}`, drafts[region_id]);
      toast.success("Lore saved. Audio will regenerate on next listen.");
      await load();
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setSavingId(null);
    }
  };

  const regenAudio = async (region_id) => {
    setRegenId(region_id);
    try {
      await api.post(`/codex/admin/region/${region_id}/audio/regenerate`);
      toast.success("Audio regenerated.");
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setRegenId(null);
    }
  };

  const setField = (id, field, value) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [field]: value } }));
  };

  return (
    <Card className="card-clay p-6 mt-4 space-y-8" data-testid="admin-codex-card">
      <p className="text-sm text-ink-700 flex items-start gap-2">
        <BookOpen className="w-4 h-4 mt-0.5 text-sunset-500 shrink-0" />
        Region lore appears in the in-game Codex (Listen / Read tabs). Editing the text invalidates the cached narration — the next listener will trigger a fresh TTS render automatically.
      </p>

      {regions.map((r) => {
        const draft = drafts[r.region_id] || { lore_title: "", lore_summary: "", lore_text: "" };
        const dirty = (
          draft.lore_title !== (r.lore_title || "") ||
          draft.lore_summary !== (r.lore_summary || "") ||
          draft.lore_text !== (r.lore_text || "")
        );
        return (
          <div
            key={r.region_id}
            className="rounded-2xl border border-ink-900/10 bg-sand-100/60 p-5"
            data-testid={`admin-codex-region-${r.region_id}`}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display text-xl text-ink-900">{r.name}</h3>
                <div className="text-[10px] tracking-[0.25em] uppercase text-ink-700 opacity-70">{r.region_id}</div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => regenAudio(r.region_id)}
                  disabled={regenId === r.region_id || !(draft.lore_text || "").trim()}
                  data-testid={`admin-codex-regen-${r.region_id}`}
                  className="rounded-full"
                >
                  {regenId === r.region_id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                  Regenerate audio
                </Button>
                <Button
                  size="sm"
                  onClick={() => save(r.region_id)}
                  disabled={savingId === r.region_id || !dirty}
                  data-testid={`admin-codex-save-${r.region_id}`}
                  className="rounded-full bg-jungle-700 hover:bg-jungle-600 text-sand-100"
                >
                  {savingId === r.region_id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                  Save
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              <div>
                <label className="text-xs font-bold tracking-wider uppercase text-ink-700">Title</label>
                <Input
                  value={draft.lore_title}
                  onChange={(e) => setField(r.region_id, "lore_title", e.target.value)}
                  data-testid={`admin-codex-title-${r.region_id}`}
                  className="mt-1 rounded-xl"
                  placeholder="e.g. Where the Sega was born"
                />
              </div>
              <div>
                <label className="text-xs font-bold tracking-wider uppercase text-ink-700">Summary</label>
                <Input
                  value={draft.lore_summary}
                  onChange={(e) => setField(r.region_id, "lore_summary", e.target.value)}
                  data-testid={`admin-codex-summary-${r.region_id}`}
                  className="mt-1 rounded-xl"
                  placeholder="One short line shown under the title."
                />
              </div>
              <div>
                <label className="text-xs font-bold tracking-wider uppercase text-ink-700 flex items-center gap-2">
                  <Volume2 className="w-3 h-3" /> Lore (read aloud by Ti Dodo) — {draft.lore_text.length}/4000
                </label>
                <Textarea
                  value={draft.lore_text}
                  onChange={(e) => setField(r.region_id, "lore_text", e.target.value.slice(0, 4000))}
                  data-testid={`admin-codex-text-${r.region_id}`}
                  className="mt-1 rounded-xl min-h-[200px] font-serif leading-relaxed"
                />
              </div>
            </div>
          </div>
        );
      })}
    </Card>
  );
}
