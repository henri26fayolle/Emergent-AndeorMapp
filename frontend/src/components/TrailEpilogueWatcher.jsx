import { useEffect, useState } from "react";
import TrailEpilogue from "@/components/TrailEpilogue";

/**
 * Global watcher mounted at the app shell. Listens for `andeor:trail-completed`
 * dispatched by SelfGuidedHud after the final check-in, and plays the Trail
 * Epilogue cutscene with the server-supplied payload.
 */
export default function TrailEpilogueWatcher() {
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      const payload = e?.detail;
      if (payload && payload.journey_id) setCurrent(payload);
    };
    window.addEventListener("andeor:trail-completed", handler);
    return () => window.removeEventListener("andeor:trail-completed", handler);
  }, []);

  if (!current) return null;
  return <TrailEpilogue epilogue={current} onClose={() => setCurrent(null)} />;
}
