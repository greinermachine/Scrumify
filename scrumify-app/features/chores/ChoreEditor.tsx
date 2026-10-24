// Displays the existing edit form for a chore's description, deadline, status, and points
"use client";

import { useState, type FormEvent } from "react";
import type { Chore, ChoreForm } from "./types";

type ChoreEditorProps = {
  chore: Chore;
  saving: boolean;
  onSave: (form: ChoreForm) => Promise<void>;
  onCancel: () => void;
};

export default function ChoreEditor({ chore, saving, onSave, onCancel }: ChoreEditorProps) {
  // Keep edits separate from the saved chore until DJANGO confirms the update
  const [form, setForm] = useState<ChoreForm>({
    description: chore.description,
    due_date: chore.due_date,
    status: chore.status,
    points: chore.points,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!saving) void onSave(form);
  }

  return (
    <form className="flex flex-col gap-2" onSubmit={submit}>
      <fieldset disabled={saving} className="flex flex-col gap-2">
        <legend>Edit chore</legend>
        <label>
          Description
          <input className="ml-2 border px-1" required value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <label>
          Due date
          <input className="ml-2 border px-1" type="date" required value={form.due_date}
            onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
        </label>
        <label>
          Status
          <select className="ml-2 border px-1" value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value as Chore["status"] })}>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </label>
        <label>
          Points
          <input className="ml-2 border px-1" type="number" required value={form.points}
            onChange={(event) => setForm({ ...form, points: Number(event.target.value) })} />
        </label>
        <div className="flex gap-2">
          <button className="rounded border px-3 py-1" type="submit">{saving ? "Saving..." : "Save"}</button>
          <button className="rounded border px-3 py-1" type="button" onClick={onCancel}>Cancel</button>
        </div>
      </fieldset>
    </form>
  );
}
