import { useEffect, useRef, useState } from "react";
import { api, formatErr } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, Map, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminGpx() {
  const [tours, setTours] = useState([]);
  const [uploadingId, setUploadingId] = useState(null);
  const [deletingKey, setDeletingKey] = useState(null);
  const inputs = useRef({});

  const load = async () => {
    const r = await api.get("/admin/tours");
    setTours(r.data);
  };
  useEffect(() => { load(); }, []);

  const onUpload = async (tour_id, file) => {
    if (!file) return;
    setUploadingId(tour_id);
    try {
      const form = new FormData();
      form.append("file", file);
      await api.post(`/codex/admin/tour/${tour_id}/gpx`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("GPX uploaded.");
      await load();
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setUploadingId(null);
      if (inputs.current[tour_id]) inputs.current[tour_id].value = "";
    }
  };

  const onDelete = async (tour_id, filename) => {
    const key = `${tour_id}__${filename}`;
    setDeletingKey(key);
    try {
      await api.delete(`/codex/admin/tour/${tour_id}/gpx/${encodeURIComponent(filename)}`);
      toast.success("GPX removed.");
      await load();
    } catch (e) {
      toast.error(formatErr(e.response?.data?.detail) || e.message);
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <Card className="card-clay p-6 mt-4 space-y-5" data-testid="admin-gpx-card">
      <p className="text-sm text-ink-700 flex items-start gap-2">
        <Map className="w-4 h-4 mt-0.5 text-sunset-500 shrink-0" />
        Upload <strong>.gpx</strong> hike/ride tracks for each tour. They appear publicly in the region Codex under "Tracks" — free to download, even by visitors who haven't booked yet (great for SEO and earning trust).
      </p>

      {tours.map((t) => (
        <div
          key={t.tour_id}
          className="rounded-2xl border border-ink-900/10 bg-sand-100/60 p-5"
          data-testid={`admin-gpx-tour-${t.tour_id}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-display text-lg text-ink-900">{t.name}</h3>
              <div className="text-[10px] tracking-[0.25em] uppercase text-ink-700 opacity-70">
                {t.region} · {t.category}
              </div>
            </div>
            <label
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-wider cursor-pointer transition-colors ${
                uploadingId === t.tour_id ? "bg-sand-200 text-ink-700" : "bg-sunset-500 text-white hover:bg-sunset-600 shadow-clay"
              }`}
              data-testid={`admin-gpx-upload-${t.tour_id}`}
            >
              {uploadingId === t.tour_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploadingId === t.tour_id ? "Uploading…" : "Upload .gpx"}
              <input
                ref={(el) => (inputs.current[t.tour_id] = el)}
                type="file"
                accept=".gpx,application/gpx+xml,application/xml,text/xml"
                hidden
                onChange={(e) => onUpload(t.tour_id, e.target.files?.[0])}
              />
            </label>
          </div>

          {(t.gpx_files || []).length === 0 ? (
            <div className="text-xs text-ink-700 italic opacity-70">No tracks uploaded yet.</div>
          ) : (
            <ul className="space-y-2">
              {t.gpx_files.map((g) => {
                const key = `${t.tour_id}__${g.filename}`;
                return (
                  <li
                    key={g.filename}
                    className="flex flex-wrap items-center gap-3 bg-white/70 rounded-xl border border-ink-900/10 px-3 py-2 text-sm"
                    data-testid={`admin-gpx-item-${t.tour_id}-${g.filename}`}
                  >
                    <div className="flex-1 min-w-[200px]">
                      <div className="font-mono text-xs truncate">{g.filename}</div>
                      <div className="text-[10px] tracking-[0.2em] uppercase text-ink-700 opacity-70 mt-0.5">
                        {typeof g.distance_km === "number" && <span>{g.distance_km.toFixed(1)} km</span>}
                        {typeof g.distance_km === "number" && typeof g.elevation_m === "number" && <span> · </span>}
                        {typeof g.elevation_m === "number" && <span>{g.elevation_m} m gain</span>}
                      </div>
                    </div>
                    <a
                      href={`${process.env.REACT_APP_BACKEND_URL}/api/codex/gpx/${t.tour_id}/${encodeURIComponent(g.filename)}`}
                      download={g.filename}
                      className="inline-flex items-center gap-1 rounded-full bg-jungle-700 hover:bg-jungle-600 text-sand-100 text-xs font-bold tracking-wider px-3 py-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(t.tour_id, g.filename)}
                      disabled={deletingKey === key}
                      className="rounded-full text-red-700 border-red-300 hover:bg-red-50"
                      data-testid={`admin-gpx-delete-${t.tour_id}-${g.filename}`}
                    >
                      {deletingKey === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </Card>
  );
}
