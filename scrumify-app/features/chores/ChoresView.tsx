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
    <div className="page">
      <header className="topbar">
        <div>
          <h1>Scrumify</h1>
          <p>Lifestyle management</p>
        </div>
        <div className="topbar-buttons">
          <button type="button" onClick={refreshChores} disabled={saving}>
            Refresh
          </button>
          <button type="button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="sheet">
        {/* The && operator displays the message only when the condition before it is true */}
        {loading && <p>Loading chores...</p>}
        {error && <p className="note" role="alert">{error}</p>}
        {saveError && <p className="note" role="alert">{saveError}</p>}

        {!loading && !error && chores.length === 0 && <p>No chores saved yet.</p>}

        {!loading && !error && chores.length > 0 && (
          <>
            <section className="upcoming">
              <h2>Upcoming chores</h2>
              {incompleteChores.length === 0 ? (
                <p className="empty">No upcoming or incomplete responsibilities!</p>
              ) : (
                <ul aria-label="Responsibilities list">
                  {incompleteChores.map((chore) => (
                    <li key={chore.id}>
                      <span className="upcoming-name">{chore.description}</span>
                      <span className="tag">{chore.due_date}</span>
                      <span className="tag">{(chore.due_time || "12:00").slice(0, 5)}</span>
                      <span className="tag">{chore.points} pts</span>
                      <span className={chore.status === "in_progress" ? "status in_progress" : "status"}>
                        {chore.status === "in_progress" ? "In progress" : "To do"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="score">Points earned: {earned}</p>

            {/* One column per status, each chore goes in the column that matches its status */}
            <div className="board" aria-label="Current chores">
              {COLUMNS.map((column) => {
                const columnChores = chores.filter((chore) => chore.status === column.key);
                return (
                  <section key={column.key} className={"col " + column.key}>
                    <h2>
                      {column.label}
                      <span className="count">{columnChores.length}</span>
                    </h2>
                    {columnChores.length === 0 && <p className="empty">Nothing here</p>}
                    <ul>
                      {/* The map function creates a card for each chore, key lets React identify each card by its ID */}
                      {columnChores.map((chore) => (
                        editingId === chore.id ? (
                          <li key={chore.id} className="chore">
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
                  </section>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
