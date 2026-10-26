"use client";

import { useEffect } from "react";
import { apiFetch } from "@/lib/api/client";

export function useAutoSweep() {
  useEffect(() => {
    const sweep = async () => {
      try {
        await apiFetch("/api/appointments/sweep", { method: "POST" });
      } catch (err) {
        // Silently catch sweep errors in background
        console.debug("Background sweep failed:", err);
      }
    };

    sweep();
    const interval = setInterval(sweep, 5 * 60 * 1000); // every 5 minutes
    return () => clearInterval(interval);
  }, []);
}
