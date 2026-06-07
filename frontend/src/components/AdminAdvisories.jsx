import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, formatErr } from "@/lib/api";
import { toast } from "sonner";
import { playClick } from "@/lib/sound";

const EMPTY = { road: "", status: "caution", note: "" };

const STATUS_STYLE = {
  caution: "bg-sun-500 text-ink-900",
  closed:  "bg-sunset-500 text-white",
  info:    "bg-ocean-500 text-white",
};

/**
 * Admin road-advisory CRUD — ad-hoc messages that surface inside the
 * Info Center → Roads & Transport tab in real time (no code deploy needed).
 */
export default function AdminAdvisories() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/admin/road-advisories");
      setRows(data || []);
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.road.trim() || !editing.note.trim()) {
      toast.error("Road name and note are required");
      return;
    }
    setBusy(true);
    try {
      if (editing.advisory_id) {
        const { advisory_id, created_at, updated_at, ...patch } = editing; // eslint-disable-line no-unused-vars
        await api.patch(`/admin/road-advisories/${advisory_id}`, patch);
        toast.success("Advisory updated");
      } else {
        await api.post("/admin/road-advisories", editing);
        toast.success("Advisory published");
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
    if (!window.confirm(`Clear advisory on '${r.road}'?`)) return;
    try {
      await api.delete(`/admin/road-advisories/${r.advisory_id}`);
      toast.success("Cleared");
      load();
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3">
        <p className="text-sm text-ink-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 text-sunset-500 shrink-0" />
          Push ad-hoc road advisories (cyclone closures, M1 roadworks, etc.).
          They appear instantly in the in-game <em>Info Center → Roads & Transport</em> tab.
        </p>
        <Button onClick={() => { playClick(); setEditing({ ...EMPTY }); }} data-testid="admin-advisory-new" className="rounded-full bg-jungle-500 hover:bg-jungle-600 text-white shrink-0">
          <Plus className="w-4 h-4 mr-1" /> New advisory
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Road</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow><TableCell colSpan={5} className="text-center italic text-ink-700 py-6">No active advisories. Tap “New advisory” to publish one.</TableCell></TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.advisory_id} data-testid={`admin-advisory-${r.advisory_id}`}>
              <TableCell className="font-semibold">{r.road}</TableCell>
              <TableCell>
                <Badge className={`rounded-full ${STATUS_STYLE[r.status] || "bg-sand-200 text-ink-900"}`}>
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{r.note}</TableCell>
              <TableCell className="text-xs text-ink-700 tabular-nums">{(r.updated_at || r.created_at || "").slice(0, 16).replace("T", " ")}</TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => { playClick(); setEditing({ ...r }); }} data-testid={`admin-advisory-edit-${r.advisory_id}`} className="rounded-full">
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => remove(r)} data-testid={`admin-advisory-delete-${r.advisory_id}`} className="rounded-full text-sunset-500 hover:text-sunset-600">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg" data-testid="admin-advisory-dialog">
          <DialogHeader>
            <DialogTitle className="font-display italic text-2xl">
              {editing?.advisory_id ? "Edit advisory" : "New advisory"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <FormField label="Road / area" required>
                  <Input
                    data-testid="admin-advisory-form-road"
                    value={editing.road}
                    onChange={(e) => setEditing({ ...editing, road: e.target.value })}
                    placeholder="M1 Motorway · Phoenix"
                  />
                </FormField>
              </div>
              <FormField label="Status">
                <select
                  data-testid="admin-advisory-form-status"
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="caution">caution</option>
                  <option value="closed">closed</option>
                  <option value="info">info</option>
                </select>
              </FormField>
              <div className="col-span-2">
                <FormField label="Note" required>
                  <textarea
                    data-testid="admin-advisory-form-note"
                    rows={3}
                    value={editing.note}
                    onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                    placeholder="Roadworks near Phoenix flyover — expect 15-min delays until 22h."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </FormField>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-full">Cancel</Button>
            <Button onClick={save} disabled={busy} data-testid="admin-advisory-save" className="rounded-full bg-sunset-500 hover:bg-sunset-600 text-white">
              {busy ? "Saving…" : (editing?.advisory_id ? "Save" : "Publish")}
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
