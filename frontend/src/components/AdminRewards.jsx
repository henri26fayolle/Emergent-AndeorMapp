import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Gift } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, formatErr } from "@/lib/api";
import { toast } from "sonner";
import { playClick } from "@/lib/sound";

const EMPTY = { reward_id: "", type: "discount", title: "", description: "", code_prefix: "", min_xp: 100, partner: "" };

/**
 * Admin reward-template CRUD — partner goodies & discount codes the system
 * grants players when they hit XP/quest milestones.
 */
export default function AdminRewards() {
  const [rewards, setRewards] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/rewards");
      setRewards(data || []);
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.reward_id.trim() || !editing.title.trim() || !editing.partner.trim()) {
      toast.error("Reward id, title and partner are required");
      return;
    }
    setBusy(true);
    try {
      const isCreate = !rewards.find((r) => r.reward_id === editing.reward_id);
      if (isCreate) {
        await api.post("/admin/rewards", editing);
        toast.success(`Created '${editing.reward_id}'`);
      } else {
        const { reward_id, ...patch } = editing; // eslint-disable-line no-unused-vars
        await api.patch(`/admin/rewards/${editing.reward_id}`, patch);
        toast.success(`Updated '${editing.reward_id}'`);
      }
      setEditing(null);
      load();
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete reward template '${r.title}'?`)) return;
    try {
      await api.delete(`/admin/rewards/${r.reward_id}`);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-ink-700 flex items-start gap-2">
          <Gift className="w-4 h-4 mt-0.5 text-sunset-500 shrink-0" />
          Discount codes and partner goodies. Players unlock these as they level up — the system mints a unique code per claim using <code className="text-xs bg-sand-100 px-1 rounded">code_prefix</code>.
        </p>
        <Button onClick={() => { playClick(); setEditing({ ...EMPTY }); }} data-testid="admin-reward-new" className="rounded-full bg-jungle-500 hover:bg-jungle-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> New reward
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reward</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Partner</TableHead>
            <TableHead>Min XP</TableHead>
            <TableHead>Code prefix</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rewards.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center italic text-ink-700 py-6">No reward templates yet. Tap “New reward” to add the first one.</TableCell></TableRow>
          )}
          {rewards.map((r) => (
            <TableRow key={r.reward_id} data-testid={`admin-reward-${r.reward_id}`}>
              <TableCell>
                <div className="font-semibold">{r.title}</div>
                <div className="text-xs text-ink-700 italic">{r.description}</div>
              </TableCell>
              <TableCell>
                <Badge className={`rounded-full ${r.type === "goodie" ? "bg-sunset-500 text-white" : "bg-ocean-500 text-white"}`}>
                  {r.type}
                </Badge>
              </TableCell>
              <TableCell>{r.partner}</TableCell>
              <TableCell className="tabular-nums">{r.min_xp}</TableCell>
              <TableCell><span className="font-mono text-xs bg-sand-100 px-2 py-1 rounded">{r.code_prefix}</span></TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => { playClick(); setEditing({ ...EMPTY, ...r }); }} data-testid={`admin-reward-edit-${r.reward_id}`} className="rounded-full">
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => remove(r)} data-testid={`admin-reward-delete-${r.reward_id}`} className="rounded-full text-sunset-500 hover:text-sunset-600">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-xl" data-testid="admin-reward-dialog">
          <DialogHeader>
            <DialogTitle className="font-display italic text-2xl">
              {editing && rewards.find((r) => r.reward_id === editing.reward_id) ? "Edit reward" : "New reward"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Reward ID" required>
                <Input
                  data-testid="admin-reward-form-id"
                  value={editing.reward_id}
                  onChange={(e) => setEditing({ ...editing, reward_id: e.target.value })}
                  disabled={!!rewards.find((r) => r.reward_id === editing.reward_id)}
                  placeholder="rwd-rhum-st-aubin"
                />
              </FormField>
              <FormField label="Type">
                <select
                  value={editing.type}
                  onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="discount">discount (next tour)</option>
                  <option value="goodie">goodie (partner)</option>
                </select>
              </FormField>
              <div className="col-span-2"><FormField label="Title" required>
                <Input data-testid="admin-reward-form-title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="10% off Rhum St Aubin tasting" />
              </FormField></div>
              <div className="col-span-2"><FormField label="Description">
                <textarea rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </FormField></div>
              <FormField label="Partner" required>
                <Input value={editing.partner} onChange={(e) => setEditing({ ...editing, partner: e.target.value })} placeholder="Rhumerie de Chamarel" />
              </FormField>
              <FormField label="Min XP">
                <Input type="number" value={editing.min_xp} onChange={(e) => setEditing({ ...editing, min_xp: Number(e.target.value) || 0 })} />
              </FormField>
              <div className="col-span-2"><FormField label="Code prefix">
                <Input value={editing.code_prefix} onChange={(e) => setEditing({ ...editing, code_prefix: e.target.value.toUpperCase() })} placeholder="RHUM10" />
              </FormField></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-full">Cancel</Button>
            <Button onClick={save} disabled={busy} data-testid="admin-reward-save" className="rounded-full bg-sunset-500 hover:bg-sunset-600 text-white">
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs tracking-[0.15em] uppercase font-bold text-ink-700">
        {label}{required && <span className="text-sunset-500"> *</span>}
      </Label>
      {children}
    </div>
  );
}
