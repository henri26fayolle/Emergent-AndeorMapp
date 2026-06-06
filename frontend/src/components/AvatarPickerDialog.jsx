import { useState } from "react";
import { motion } from "framer-motion";
import { AVATARS } from "@/lib/avatars";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api, formatErr } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function AvatarPickerDialog({ open, onOpenChange }) {
  const { user, refresh } = useAuth();
  const [picked, setPicked] = useState(user?.avatar || null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!picked || picked === user?.avatar) { onOpenChange(false); return; }
    setBusy(true);
    try {
      await api.patch("/me", { avatar: picked });
      await refresh();
      toast.success("Explorer changed.");
      onOpenChange(false);
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="avatar-picker-dialog" className="rounded-3xl max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Change your explorer</DialogTitle>
          <DialogDescription className="text-ink-700">Pick a new identity for your Mauritius quest.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 py-2">
          {AVATARS.map((a, i) => {
            const Icon = a.icon;
            const selected = picked === a.id;
            return (
              <motion.button
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setPicked(a.id)}
                data-testid={`avatar-picker-${a.id}`}
                className={`group text-left rounded-2xl p-4 border-2 transition-colors ${selected ? "border-sunset-500 bg-sand-100 shadow-clay" : "border-transparent bg-sand-100/60 hover:bg-sand-100"}`}
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${a.gradient} text-white flex items-center justify-center mb-3`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="font-display text-base">{a.name}</div>
                <div className="text-xs text-ink-700 mt-1">{a.bio}</div>
                {selected && <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-sunset-500">Selected</div>}
              </motion.button>
            );
          })}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="avatar-picker-cancel" className="rounded-full">Cancel</Button>
          <Button onClick={save} disabled={busy || !picked} data-testid="avatar-picker-save" className="rounded-full bg-jungle-500 hover:bg-jungle-600 text-white">
            {busy ? "Saving…" : "Save explorer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
