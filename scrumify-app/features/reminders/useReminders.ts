"use client";

import { useEffect, useState } from "react";
import type { Reminder } from "./types";

export function useReminders(
  token: string,
  onUnauthorized: () => void
) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let active = true;
    let controller: AbortController | undefined;

    async function loadReminders() {
      controller?.abort();

      const requestController = new AbortController();
      controller = requestController;

      try {
        const response = await fetch("/api/reminders/", {
          cache: "no-store",
          signal: requestController.signal,
          headers: {
            Authorization: `Token ${token}`,
          },
        });

        if (!active || requestController.signal.aborted) return;

        if (response.status === 401) {
          onUnauthorized();
          return;
        }

        if (!response.ok) {
          throw new Error();
        }

        const data = await response.json();

        if (!active || requestController.signal.aborted) return;

        setReminders(data.reminders);
        setError("");
      } catch (error) {
        if (
          active &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          setError("Could not load reminders. Please try again.");
        }
      } finally {
        if (active && !requestController.signal.aborted) {
          setLoading(false);
        }
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void loadReminders();
      }
    }

    void loadReminders();

    window.addEventListener("focus", loadReminders);
    window.addEventListener("pageshow", loadReminders);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      controller?.abort();

      window.removeEventListener("focus", loadReminders);
      window.removeEventListener("pageshow", loadReminders);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshVersion, token, onUnauthorized]);

  function refreshReminders() {
    setRefreshVersion((current) => current + 1);
  }

  return {
    reminders,
    loading,
    error,
    refreshReminders,
  };
}