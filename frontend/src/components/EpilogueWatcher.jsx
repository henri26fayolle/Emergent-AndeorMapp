import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import MainQuestEpilogue from "@/components/MainQuestEpilogue";

/**
 * Global watcher mounted once at the app shell. After a successful tour
 * check-in (or any other XP-granting moment), Quests dispatches a window event
 * `andeor:checkin-completed`. We then poll /main-quests/check-completion and
 * play the Epilogue cutscene for each newly-completed saga.
 */
export default function EpilogueWatcher() {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/main-quests/check-completion");
      const newly = data?.newly_completed || [];
      if (newly.length > 0) {
        setQueue((q) => [...q, ...newly]);
        window.dispatchEvent(new Event("andeor:notifications-refresh"));
      }
    } catch {
      // Silent — no epilogue if endpoint fails.
    }
  }, []);

  useEffect(() => {
    const handler = () => { refresh(); };
    window.addEventListener("andeor:checkin-completed", handler);
    return () => window.removeEventListener("andeor:checkin-completed", handler);
  }, [refresh]);

  // Drain the queue one cutscene at a time
  useEffect(() => {
    if (!current && queue.length > 0) {
      queueMicrotask(() => {
        setCurrent(queue[0]);
        setQueue((q) => q.slice(1));
      });
    }
  }, [current, queue]);

  if (!current) return null;
  return (
    <MainQuestEpilogue
      quest={current}
      onClose={() => setCurrent(null)}
    />
  );
}
