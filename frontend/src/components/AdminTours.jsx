import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, formatErr } from "@/lib/api";
import { toast } from "sonner";
import { playClick } from "@/lib/sound";

const CATEGORIES = ["outdoor", "culture", "food", "water", "other"];

const EMPTY = {
  tour_id: "", name: "", region: "", subregion: "", category: "outdoor",
  description: "", price: 0, duration: "", xp_reward: 50,
  card_id: "", badge_id: "", image: "", guide_pin: "",
};

/**
 * Admin tour CRUD — list + create + edit + delete.
 * Delete is blocked by the backend if any active booking still references the tour.
 */
export default function AdminTours({ tours, reload }) {
  const [editing, setEditing] = useState(null);   // null | EMPTY | a tour
  const [busy, setBusy] = useState(false);

  const startCreate = () => { playClick(); setEditing({ ...EMPTY }); };
  const startEdit   = (t) => { playClick(); setEditing({ ...EMPTY, ...t }); };

  const save = async () => {
    if (!editing) return;
    if (!editing.tour_id.trim() || !editing.name.trim()) {
      toast.error("Tour id and name are required");
      return;
    }
    setBusy(true);
    try {
      const isCreate = !tours.find((t) => t.tour_id === editing.tour_id);
      if (isCreate) {
        await api.post("/admin/tours", editing);
        toast.success(`Created '${editing.tour_id}'`);
      } else {
        const { tour_id, ...patch } = editing; // eslint-disable-line no-unused-vars
        await api.patch(`/admin/tours/${editing.tour_id}`, patch);
        toast.success(`Updated '${editing.tour_id}'`);
      }
      setEditing(null);
      reload && reload();
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (tour) => {
    if (!window.confirm(`Delete '${tour.name}'? This can't be undone.`)) return;
    try {
      await api.delete(`/admin/tours/${tour.tour_id}`);
      toast.success("Deleted");
      reload && reload();
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    }
  };

  const copyPin = async (pin) => {
    try { await navigator.clipboard.writeText(pin); toast.success(`Guide PIN copied: ${pin}`); }
    catch { toast.error("Copy failed"); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-ink-700">
          Create, edit and retire tours. Players claim XP when their guide types the PIN at trail's end.
        </p>
        <Button onClick={startCreate} data-testid="admin-tour-new" className="rounded-full bg-jungle-500 hover:bg-jungle-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> New tour
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tour</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>XP</TableHead>
            <TableHead>Guide PIN</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tours.map((t) => (
            <TableRow key={t.tour_id} data-testid={`admin-tour-${t.tour_id}`}>
              <TableCell className="font-semibold">{t.name}</TableCell>
              <TableCell><Badge className="rounded-full bg-sand-200 text-ink-900">{t.category}</Badge></TableCell>
              <TableCell className="text-sm text-ink-700">{t.region}{t.subregion ? ` · ${t.subregion}` : ""}</TableCell>
              <TableCell className="tabular-nums">{t.xp_reward}</TableCell>
              <TableCell>
                <span data-testid={`admin-pin-${t.tour_id}`} className="font-display text-base tracking-[0.2em] uppercase bg-sand-100 border border-dashed border-ink-900/20 rounded-lg px-2 py-1">
                  {t.guide_pin}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => copyPin(t.guide_pin)} className="rounded-full">
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => startEdit(t)} data-testid={`admin-tour-edit-${t.tour_id}`} className="rounded-full">
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => remove(t)} data-testid={`admin-tour-delete-${t.tour_id}`} className="rounded-full text-sunset-500 hover:text-sunset-600">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl" data-testid="admin-tour-dialog">
          <DialogHeader>
            <DialogTitle className="font-display italic text-2xl">
              {editing && tours.find((t) => t.tour_id === editing.tour_id) ? "Edit tour" : "New tour"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
              <FormField label="Tour ID" required>
                <Input
                  data-testid="admin-tour-form-id"
                  value={editing.tour_id}
                  onChange={(e) => setEditing({ ...editing, tour_id: e.target.value })}
                  disabled={!!tours.find((t) => t.tour_id === editing.tour_id)}
                  placeholder="t-snorkel-blue-bay"
                />
              </FormField>
              <FormField label="Name" required>
                <Input data-testid="admin-tour-form-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </FormField>
              <FormField label="Region">
                <Input value={editing.region} onChange={(e) => setEditing({ ...editing, region: e.target.value })} placeholder="north-coast" />
              </FormField>
              <FormField label="Subregion">
                <Input value={editing.subregion || ""} onChange={(e) => setEditing({ ...editing, subregion: e.target.value })} />
              </FormField>
              <FormField label="Category">
                <select
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label="Duration">
                <Input value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: e.target.value })} placeholder="2h" />
              </FormField>
              <FormField label="Price (MUR)">
                <Input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) || 0 })} />
              </FormField>
              <FormField label="XP reward">
                <Input type="number" value={editing.xp_reward} onChange={(e) => setEditing({ ...editing, xp_reward: Number(e.target.value) || 0 })} />
              </FormField>
              <FormField label="Card ID">
                <Input value={editing.card_id || ""} onChange={(e) => setEditing({ ...editing, card_id: e.target.value })} />
              </FormField>
              <FormField label="Badge ID">
                <Input value={editing.badge_id || ""} onChange={(e) => setEditing({ ...editing, badge_id: e.target.value })} />
              </FormField>
              <FormField label="Guide PIN">
                <Input value={editing.guide_pin || ""} onChange={(e) => setEditing({ ...editing, guide_pin: e.target.value.toUpperCase() })} placeholder="REEF42" />
              </FormField>
              <FormField label="Image URL">
                <Input value={editing.image || ""} onChange={(e) => setEditing({ ...editing, image: e.target.value })} />
              </FormField>
              <div className="col-span-2">
                <FormField label="Description">
                  <textarea
                    rows={3}
                    value={editing.description || ""}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </FormField>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-full">Cancel</Button>
            <Button onClick={save} disabled={busy} data-testid="admin-tour-save" className="rounded-full bg-sunset-500 hover:bg-sunset-600 text-white">
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
