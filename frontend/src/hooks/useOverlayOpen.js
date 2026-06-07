import { useEffect, useState } from "react";

/**
 * Returns true when any "blocking" overlay/modal is mounted in the DOM —
 * used by the floating Focused Quest HUD to step out of the way when the
 * Character Sheet, sub-maps, venue modals or cinematic transitions appear.
 *
 * Tracks the live set of modal selectors via a single MutationObserver
 * on document.body. Cheap (no polling, no global store).
 */
const BLOCKERS = [
  '[data-testid="character-sheet"]',
  '[data-testid="venue-modal"]',
  '[data-testid="info-center"]',
  '[data-testid="meteo-station"]',
  '[data-testid="self-guided-modal"]',
  '[data-testid="trail-epilogue"]',
  '[data-testid="main-quest-epilogue"]',
  '[data-testid="map-cinematic"]',
  '[data-testid^="region-sub-map-"]', // any city sub-map
];

function checkAnyOpen() {
  return BLOCKERS.some((sel) => document.querySelector(sel));
}

export default function useOverlayOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let pending = false;
    const recompute = () => {
      if (pending) return;
      pending = true;
      // Coalesce DOM mutations within a frame
      requestAnimationFrame(() => {
        pending = false;
        setOpen(checkAnyOpen());
      });
    };
    // Initial check
    setOpen(checkAnyOpen());
    const obs = new MutationObserver(recompute);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  return open;
}
