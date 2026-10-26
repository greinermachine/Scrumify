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
    <form className="editor" onSubmit={submit}>
      <fieldset disabled={saving} className="editor">
        <legend>Edit chore</legend>
        <label>
          Description
          <input required value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <label>
          Due date
          <input type="date" required value={form.due_date}
            onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
        </label>
        <label>
          Status
          <select value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value as Chore["status"] })}>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
        </label>
        <label>
          Points
          <input type="number" required value={form.points}
            onChange={(event) => setForm({ ...form, points: Number(event.target.value) })} />
        </label>
        <div className="row">
          <button type="submit">{saving ? "Saving" : "Save"}</button>
          <button className="cancel" type="button" onClick={onCancel}>Cancel</button>
        </div>
      </fieldset>
    </form>
  );
}
