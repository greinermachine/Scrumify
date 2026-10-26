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
    <div className="page">
      <main className="sheet">
        <h1>Scrumify</h1>
        <p>House chores</p>
        {error && <p className="note" role="alert">{error}</p>}
        <form onSubmit={logIn} className="signin">
          <label>
            Username
            <input
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button type="submit" disabled={signingIn}>
            {signingIn ? "Signing in" : "Sign in"}
          </button>
        </form>
      </main>
    </div>
  );
}
