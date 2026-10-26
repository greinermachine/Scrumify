// Displays sign-in or the signed-in user's chores, with editing, refreshing, and error messages
"use client";

import ChoreCard from "./ChoreCard";
import ChoreEditor from "./ChoreEditor";
import SignInForm from "./SignInForm";
import { useState } from "react";
import { useAuth } from "./useAuth";
import { useChores } from "./useChores";
import { useToday } from "./useToday";
import type { Chore, ChoreForm } from "./types";

const COLUMNS: { key: Chore["status"]; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "done", label: "Done" },
];

export default function ChoresView() {
  const { token, signIn, signOut } = useAuth();
  if (token === null) return <p className="page">Checking saved login...</p>;
  if (!token) return <SignInForm onSignIn={signIn} />;

  // A different token creates a fresh list, clearing the previous account's chores and edits
  return <SignedInChores key={token} token={token} onSignOut={signOut} />;
}

function SignedInChores({ token, onSignOut }: { token: string; onSignOut: () => void }) {
  // The useChores hook handles the data and requests, this component handles the visible part
  const { chores, loading, error, refreshChores, saveChore, completeChore, completingId, saving, saveError, clearSaveError } = useChores(token, onSignOut);
  const [editingId, setEditingId] = useState<number | null>(null);
  const today = useToday();
  const earned = chores
    .filter((chore) => chore.status === "done")
    .reduce((sum, chore) => sum + chore.points, 0);

  // filters out the completed chores, and sorts them by date chronologically
  const incompleteChores = chores
    .filter((chore) => chore.status !== "done")
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  async function saveEdits(choreId: number, form: ChoreForm) {
    if (await saveChore(choreId, form)) setEditingId(null);
  }

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
      
            {error && <p role="alert">{error}</p>}
      {saveError && <p role="alert">{saveError}</p>}
      
      {!loading && !error && (
        <section className="rounded-xl border p-5 bg-gray-50/50 space-y-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Chores List</h2>
            <p className="text-sm text-gray-500">Upcoming chores.</p>
          </div>
          {incompleteChores.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No upcoming or incomplete responsibilities!</p>
          ) : (
            <ul className="divide-y divide-gray-200 border rounded-lg bg-white overflow-hidden shadow-sm" aria-label="Responsibilities list">
              {incompleteChores.map((chore) => (
                <li key={chore.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition">
                  <div className="space-y-1">
                    <p className="font-medium text-gray-800">{chore.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        Due Date: {chore.due_date}
                      </span>
                      <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                        Time: {chore.due_time || "12:00 PM"}
                      </span>
                      <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                        Points: {chore.points} pts
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                    chore.status === "in_progress" 
                      ? "bg-amber-100 text-amber-800 border-amber-200" 
                      : "bg-gray-100 text-gray-800 border-gray-200"
                  }`}>
                    {chore.status === "in_progress" ? "In Progress" : "To Do"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!loading && !error && chores.length === 0 && <p>No chores saved yet.</p>}


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
