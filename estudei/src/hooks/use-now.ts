"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * The current time, ticking every `intervalMs`. Starts from the server's
 * timestamp so the first client render matches the server HTML exactly; the
 * retention numbers then keep decaying live while the page is open.
 *
 * When the server sends a fresher timestamp (after router.refresh()), that
 * one wins until the next tick.
 */
export function useNow(serverNow: string, intervalMs = 60_000): Date {
  const [tick, setTick] = useState(() => new Date(serverNow));

  useEffect(() => {
    const id = window.setInterval(() => setTick(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return useMemo(() => {
    const server = new Date(serverNow);
    return tick.getTime() > server.getTime() ? tick : server;
  }, [tick, serverNow]);
}
