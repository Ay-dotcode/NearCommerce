import { useCallback, useState } from "react";

const SEEN_KEY = "nc-owner-tour-seen";

function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    // Storage blocked: treat the tour as seen so it never nags on every page load.
    return true;
  }
}

function writeSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Not remembered; the owner can still reopen the tour by hand.
  }
}

// Controls the first-run tour for store owners. It opens by itself once for a new owner (when
// `eligible`, i.e. the page behind it is ready), is remembered on this device after it is
// finished or skipped, and can be started again by hand with `start`.
export function useOwnerTour(eligible = true) {
  const [seen, setSeen] = useState(readSeen);
  const [manual, setManual] = useState(false);

  const start = useCallback(() => setManual(true), []);
  const finish = useCallback(() => {
    writeSeen();
    setSeen(true);
    setManual(false);
  }, []);

  return { open: manual || (eligible && !seen), start, finish };
}
