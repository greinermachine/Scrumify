// Loads and edits the signed-in user's chores through DJANGO, with refresh and error handling
"use client";

import { useEffect, useRef, useState } from "react";
import type { Chore, ChoreForm } from "./types";

export function useChores(token: string, onUnauthorized: () => void) {
  // The useState hook remembers data between renders, each pair contains the current value
  // The setter, setChores(newList), updates chores and tells React to redraw the page
  const [chores, setChores] = useState<Chore[]>([]); // Holds the list of chores, initially empty
  const [loading, setLoading] = useState(true); // Controls whether the initial loading message is shown
  const [refreshVersion, setRefreshVersion] = useState(0); // Triggers another load when changed
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const savePending = useRef(false);
  const loadController = useRef<AbortController | undefined>(undefined);
  const saveController = useRef<AbortController | undefined>(undefined);

  // Read saved chores on opening the app and when returning from the admin/API
  // Runs after the component is drawn, and again when the login or refresh version changes
  useEffect(() => {
    let active = true;
    let controller: AbortController | undefined;

    async function loadChores() {
      // Do not let a list request replace a chore while its edits are being saved
      if (savePending.current) return;
      // Stop the previous request before starting another one, ? skips this if there is no controller
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      loadController.current = requestController;
      try {
        // Request data from DJANGO
        const response = await fetch("/api/chores/", {
          cache: "no-store",
          signal: requestController.signal,
          headers: { Authorization: `Token ${token}` },
        });
        if (!active || requestController.signal.aborted) return;
        if (response.status === 401) { onUnauthorized(); return; }
        if (!response.ok) throw new Error();
        const data = await response.json();
        // Ignore results if this effect has been cleaned up or the request was cancelled
        if (!active || requestController.signal.aborted) return;
        setChores(data.chores);
        setError("");
      } catch (error) {
        // Cancelling a request is expected when refreshing, so don't display it as an error
        if (active && !(error instanceof DOMException && error.name === "AbortError")) {
          setError("Could not load chores. Select Refresh chores to try again.");
        }
      } finally {
        if (active && !requestController.signal.aborted) setLoading(false);
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void loadChores();
    }

    // Load now, then listen for the user returning to the page
    void loadChores();
    window.addEventListener("focus", loadChores);
    window.addEventListener("pageshow", loadChores);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    // CLEANUP: runs before this effect starts again, or when the component is removed
    return () => {
      active = false;
      controller?.abort();
      saveController.current?.abort();
      window.removeEventListener("focus", loadChores);
      window.removeEventListener("pageshow", loadChores);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshVersion, token, onUnauthorized]);

  function refreshChores() {
    // Changing this value runs the effect again, which loads the latest chores
    setRefreshVersion((current) => current + 1);
  }

  async function saveChore(choreId: number, form: ChoreForm) {
    // Block repeated saves immediately, without waiting for the next render
    if (savePending.current) return false;
    savePending.current = true;
    loadController.current?.abort();
    setSaving(true);
    setSaveError("");
    const requestController = new AbortController();
    saveController.current = requestController;
    try {
      const response = await fetch(`/api/chores/${choreId}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify(form),
        signal: requestController.signal,
      });
      // Signing out cancels this request so its response cannot affect a later login
      if (requestController.signal.aborted) return false;
      if (response.status === 401) { onUnauthorized(); return false; }
      if (!response.ok) throw new Error();
      const savedChore: Chore = await response.json();
      // Replace this chore with the saved server response, preserving the rest of the list
      setChores((current) => current.map((chore) => chore.id === savedChore.id ? savedChore : chore));
      return true;
    } catch {
      if (!requestController.signal.aborted) setSaveError("Could not save the chore. Check the fields and try again.");
      return false;
    } finally {
      savePending.current = false;
      setSaving(false);
      refreshChores();
    }
  }

  function clearSaveError() { setSaveError(""); }

  return { chores, loading, error, refreshChores, saveChore, saving, saveError, clearSaveError };
}
