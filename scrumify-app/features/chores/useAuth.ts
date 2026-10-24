// Remembers the signed-in user's token and keeps the page in sync with browser storage
"use client";

import { useCallback, useSyncExternalStore } from "react";

const authEvent = "scrumify-auth-change";
let memoryToken = "";
let storageUnavailable = false;

function readToken() {
  if (storageUnavailable) return memoryToken;
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return memoryToken;
  }
}

function subscribe(onChange: () => void) {
  // Storage events come from other tabs, the custom event updates the current tab
  window.addEventListener("storage", onChange);
  window.addEventListener(authEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(authEvent, onChange);
  };
}

function writeToken(token: string) {
  memoryToken = token;
  try {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  } catch {
    // Keep this login in memory if the browser does not allow saved storage
    storageUnavailable = true;
  }
  window.dispatchEvent(new Event(authEvent));
}

function serverToken() {
  // Null means the browser has not checked for a saved login yet
  return null;
}

export function useAuth() {
  // React reads the saved token and renders again when the subscribed storage changes
  const token = useSyncExternalStore(subscribe, readToken, serverToken);

  function signIn(userToken: string) {
    writeToken(userToken);
  }

  // Keep this function stable so useChores does not restart its effect on every render
  const signOut = useCallback(() => writeToken(""), []);

  return { token, signIn, signOut };
}
