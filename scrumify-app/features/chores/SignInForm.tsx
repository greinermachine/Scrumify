// Displays the existing username/password login and requests a token from DJANGO
"use client";

import { useState, type FormEvent } from "react";

export default function SignInForm({ onSignIn }: { onSignIn: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  async function logIn(event: FormEvent<HTMLFormElement>) {
    // Prevent the browser from navigating away when the form is submitted
    event.preventDefault();
    if (signingIn) return;
    setSigningIn(true);
    setError("");
    try {
      const response = await fetch("/api/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        setError(response.status === 400 ? "Wrong username or password." : "Could not sign in. Try again.");
        return;
      }
      const data = await response.json();
      if (typeof data.token !== "string" || !data.token) throw new Error();
      setPassword("");
      onSignIn(data.token);
    } catch {
      setError("Could not sign in. Is the Django server running?");
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Sign in</h1>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={logIn} className="flex flex-col gap-2">
        <label>
          Username
          <input
            className="ml-2 border px-1"
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            className="ml-2 border px-1"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <div>
          <button className="rounded border px-3 py-1" type="submit" disabled={signingIn}>
            {signingIn ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
    </main>
  );
}
