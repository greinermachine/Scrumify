// Displays sign-in or the signed-in user's chores, with editing, refreshing, and error messages
"use client";

import ChoreCard from "./ChoreCard";
import ChoreEditor from "./ChoreEditor";
import SignInForm from "./SignInForm";
import { useState } from "react";
import { useAuth } from "./useAuth";
import { useChores } from "./useChores";
import { useToday } from "./useToday";
import type { ChoreForm } from "./types";

export default function ChoresView() {
  const { token, signIn, signOut } = useAuth();
  if (token === null) return <p>Checking saved login...</p>;
  if (!token) return <SignInForm onSignIn={signIn} />;

  // A different token creates a fresh list, clearing the previous account's chores and edits
  return <SignedInChores key={token} token={token} onSignOut={signOut} />;
}

function SignedInChores({ token, onSignOut }: { token: string; onSignOut: () => void }) {
  // The useChores hook handles the data and requests, this component handles the visible part
  const { chores, loading, error, refreshChores, saveChore, completeChore, completingId, saving, saveError, clearSaveError } = useChores(token, onSignOut);
  const [editingId, setEditingId] = useState<number | null>(null);
  const today = useToday();

  async function saveEdits(choreId: number, form: ChoreForm) {
    if (await saveChore(choreId, form)) setEditingId(null);
  }

  // This is JSX: HTML-like tags with JavaScript expressions inside {braces}
  // The className attribute is React's spelling of HTML's class attribute, these classes add styling
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Current chores</h1>
        <button type="button" onClick={onSignOut}>Sign out</button>
        <button
          onClick={refreshChores}
          disabled={saving}
          className="rounded border px-3 py-1"
        >
          Refresh chores
        </button>
      </div>
      {/* The && operator displays the message only when the condition before it is true */}
      {loading && <p>Loading chores...</p>}
      {error && <p role="alert">{error}</p>}
      {saveError && <p role="alert">{saveError}</p>}
      {!loading && !error && chores.length === 0 && <p>No chores saved yet.</p>}
      {chores.length > 0 && (
        <ul className="space-y-3" aria-label="Current chores">
          {/* The map function creates a card for each chore, key lets React identify each card by its ID */}
          {chores.map((chore) => (
            editingId === chore.id ? (
              <li key={chore.id} className="rounded border p-4">
                <ChoreEditor
                  chore={chore}
                  saving={saving}
                  onSave={(form) => saveEdits(chore.id, form)}
                  onCancel={() => { setEditingId(null); clearSaveError(); }}
                />
              </li>
            ) : (
              <ChoreCard key={chore.id} chore={chore} saving={saving}
                today={today} completingId={completingId} onComplete={completeChore}
                onEdit={() => { setEditingId(chore.id); clearSaveError(); }} />
            )
          ))}
        </ul>
      )}
    </main>
  );
}
