// Loads, starts, and ends the signed-in user's routine freeze through DJANGO
// Starting or ending a freeze moves due dates, so onChoresChanged reloads the chores afterwards
"use client";

import { useEffect, useState } from "react";
import type { Freeze, FreezeWindow } from "./types";

export function useFreeze(token: string, onUnauthorized: () => void, onChoresChanged: () => void) {
  const [freeze, setFreeze] = useState<Freeze | null>(null);
  // Every freeze, so chores missed during any of them aren't penalized
  const [freezes, setFreezes] = useState<FreezeWindow[]>([]);
  const [reloadVersion, setReloadVersion] = useState(0); // Loads the freeze again when changed
  const [freezeSaving, setFreezeSaving] = useState(false);
  const [freezeError, setFreezeError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadFreeze() {
      try {
        const response = await fetch("/api/freeze/", {
          cache: "no-store",
          signal: controller.signal,
          headers: { Authorization: `Token ${token}` },
        });
        if (response.status === 401) { onUnauthorized(); return; }
        if (!response.ok) throw new Error();
        const data = await response.json();
        setFreeze(data.freeze);
        setFreezes(data.freezes);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setFreezeError("Could not check whether your routine is frozen.");
        }
      }
    }

    void loadFreeze();
    // Check again when the user comes back, in case the freeze changed on another device
    window.addEventListener("focus", loadFreeze);
    return () => {
      controller.abort();
      window.removeEventListener("focus", loadFreeze);
    };
  }, [token, onUnauthorized, reloadVersion]);

  async function send(url: string, body: object, ending: boolean) {
    setFreezeSaving(true);
    setFreezeError("");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify(body),
      });
      if (response.status === 401) { onUnauthorized(); return false; }
      if (!response.ok) throw new Error();
      setFreeze(ending ? null : await response.json());
      // Reload the freeze history too, since starting or ending changes it
      setReloadVersion((current) => current + 1);
      onChoresChanged();
      return true;
    } catch {
      setFreezeError(ending
        ? "Could not end the freeze. Try again."
        : "Could not start the freeze. Check the end date and try again.");
      return false;
    } finally {
      setFreezeSaving(false);
    }
  }

  function startFreeze(startDate: string, endDate: string) {
    return send("/api/freeze/", { start_date: startDate, end_date: endDate }, false);
  }

  // Send the browser's date, since the server may be in another time zone
  function endFreeze(today: string) {
    return send("/api/freeze/end/", { today }, true);
  }

  return { freeze, freezes, freezeSaving, freezeError, startFreeze, endFreeze };
}
