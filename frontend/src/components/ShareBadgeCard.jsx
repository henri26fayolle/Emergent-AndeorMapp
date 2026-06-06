import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Award, Download, Share2, Loader2, Sparkles } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "sonner";

const TONE_BG = {
  ocean:  "linear-gradient(155deg,#0E4D5C 0%,#0A6F86 50%,#1F8FA8 100%)",
  jungle: "linear-gradient(155deg,#0C3D2E 0%,#175A3F 50%,#2A8A5E 100%)",
  sunset: "linear-gradient(155deg,#7A2A19 0%,#C95B2A 50%,#F08A3D 100%)",
};

/**
 * Shareable PNG card for an unlocked badge.
 * Props:
 *  - open, onOpenChange
 *  - badge: { id, name, desc, tone }
 *  - tour:  { name, region } (optional)
 *  - regionName: string (optional pretty name)
 *  - lore: { lore_title, lore_summary } (optional)
 *  - player: { name, level }
 */
export default function ShareBadgeCard({ open, onOpenChange, badge, tour, regionName, lore, player }) {
  const cardRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const filename = `andeor-${(badge?.id || "badge").replace(/^badge-/, "")}.png`;

  const renderPng = async () => {
    if (!cardRef.current) return null;
    const canvas = await html2canvas(cardRef.current, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
    });
    return canvas;
  };

  const download = async () => {
    setBusy(true);
    try {
      const canvas = await renderPng();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Badge saved! Share it with your friends.");
    } catch (e) {
      toast.error("Could not export. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    setBusy(true);
    try {
      const canvas = await renderPng();
      if (!canvas) return;
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png", 0.95));
      if (!blob) throw new Error("No blob");
      const file = new File([blob], filename, { type: "image/png" });
      const data = {
        title: `${badge.name} · An Deor`,
        text: `I just unlocked ${badge.name} on An Deor — Mauritius explored, one quest at a time. 🇲🇺`,
        files: [file],
      };
      if (navigator.canShare && navigator.canShare(data)) {
        await navigator.share(data);
      } else {
        // Fallback: download instead
        const link = document.createElement("a");
        link.download = filename;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast.message("Sharing not supported — saved the image instead.");
      }
    } catch (e) {
      if (e?.name !== "AbortError") toast.error("Share cancelled.");
    } finally {
      setBusy(false);
    }
  };

  if (!badge) return null;
  const tone = TONE_BG[badge.tone] || TONE_BG.jungle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="share-badge-dialog"
        className="rounded-3xl max-w-[460px] p-0 overflow-hidden bg-jungle-700 border-jungle-700"
      >
        <DialogTitle className="sr-only">Share badge {badge.name}</DialogTitle>

        {/* === The card that becomes a PNG === */}
        <div className="p-5 bg-jungle-700">
          <div
            ref={cardRef}
            data-testid="share-badge-card"
            style={{
              width: 420,
              minHeight: 540,
              background: tone,
              borderRadius: 28,
              padding: 28,
              color: "#F4E9C9",
              position: "relative",
              overflow: "hidden",
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}
          >
            {/* Soft grain */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.18,
                background:
                  "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
                backgroundSize: "4px 4px",
                pointerEvents: "none",
              }}
            />
            {/* Top bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                position: "relative",
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: "0.35em", textTransform: "uppercase", opacity: 0.85, fontFamily: "Helvetica, Arial, sans-serif", fontWeight: 700 }}>
                An Deor · Mauritius
              </div>
              <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", opacity: 0.75, fontFamily: "Helvetica, Arial, sans-serif", fontWeight: 600 }}>
                Quest Seal
              </div>
            </div>

            {/* Big seal */}
            <div
              style={{
                marginTop: 36,
                display: "flex",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: "50%",
                  background: "rgba(244,233,201,0.12)",
                  border: "3px solid rgba(244,233,201,0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: "50%",
                    background: "#F4E9C9",
                    color: "#0C3D2E",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                  }}
                >
                  <Award size={48} />
                </div>
              </div>
            </div>

            {/* Title block */}
            <div style={{ textAlign: "center", marginTop: 28, position: "relative" }}>
              <div
                style={{
                  fontStyle: "italic",
                  fontSize: 32,
                  lineHeight: 1.05,
                  textShadow: "0 2px 12px rgba(0,0,0,0.45)",
                }}
              >
                {badge.name}
              </div>
              {(lore?.lore_title || regionName) && (
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.3em",
                    textTransform: "uppercase",
                    opacity: 0.85,
                    marginTop: 8,
                    fontFamily: "Helvetica, Arial, sans-serif",
                    fontWeight: 700,
                  }}
                >
                  {lore?.lore_title || regionName}
                </div>
              )}
            </div>

            {/* Tagline */}
            <div
              style={{
                textAlign: "center",
                marginTop: 14,
                fontSize: 14,
                lineHeight: 1.4,
                opacity: 0.95,
                fontStyle: "italic",
                padding: "0 12px",
              }}
            >
              {lore?.lore_summary || badge.desc}
            </div>

            {/* Bottom — player info + branding */}
            <div
              style={{
                marginTop: 28,
                paddingTop: 18,
                borderTop: "1px dashed rgba(244,233,201,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                position: "relative",
              }}
            >
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", opacity: 0.7, fontFamily: "Helvetica, Arial, sans-serif", fontWeight: 700 }}>
                  Adventurer
                </div>
                <div style={{ fontSize: 18, marginTop: 4, fontStyle: "italic" }}>
                  {player?.name || "Explorer"}
                </div>
              </div>
              {tour?.name && (
                <div style={{ textAlign: "right", maxWidth: 220 }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", opacity: 0.7, fontFamily: "Helvetica, Arial, sans-serif", fontWeight: 700 }}>
                    Earned at
                  </div>
                  <div style={{ fontSize: 14, marginTop: 4, lineHeight: 1.2 }}>
                    {tour.name}
                  </div>
                </div>
              )}
            </div>

            {/* Watermark */}
            <div
              style={{
                position: "absolute",
                bottom: 14,
                left: 0,
                right: 0,
                textAlign: "center",
                fontSize: 9,
                letterSpacing: "0.4em",
                textTransform: "uppercase",
                opacity: 0.55,
                fontFamily: "Helvetica, Arial, sans-serif",
                fontWeight: 700,
              }}
            >
              andeor.mu — book the next quest
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <Button
              onClick={download}
              disabled={busy}
              data-testid="share-badge-download"
              className="flex-1 rounded-full bg-sunset-500 hover:bg-sunset-600 text-white font-bold tracking-wider"
            >
              {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
              Save PNG
            </Button>
            <Button
              onClick={share}
              disabled={busy}
              variant="outline"
              data-testid="share-badge-share"
              className="flex-1 rounded-full font-bold tracking-wider text-jungle-700 border-sand-100/40 bg-sand-100 hover:bg-white"
            >
              <Share2 className="w-4 h-4 mr-1.5" /> Share
            </Button>
          </div>
          <div className="text-[10px] text-center text-sand-100/70 mt-3 tracking-[0.25em] uppercase flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Post it on Insta & tag @andeor.mu
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
