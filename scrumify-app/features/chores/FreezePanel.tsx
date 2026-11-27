// Shows whether the routine is frozen, with controls to start a freeze or end it early
"use client";

import { useState, type FormEvent } from "react";
import { dayAfter } from "./freezeDates";
import { formatDate } from "./formatDate";
import type { Freeze } from "./types";

type FreezePanelProps = {
  freeze: Freeze | null;
  active: boolean;
  today: string;
  saving: boolean;
  error: string;
  onStart: (startDate: string, endDate: string) => Promise<boolean>;
  onEnd: (today: string) => Promise<boolean>;
};

export default function FreezePanel({ freeze, active, today, saving, error, onStart, onEnd }: FreezePanelProps) {
  const [choosing, setChoosing] = useState(false);
  const [endDate, setEndDate] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // The freeze starts today and runs through the chosen end date
    if (!saving && await onStart(today, endDate)) {
      setChoosing(false);
      setEndDate("");
    }
  }

  if (active && freeze) {
    return (
      // role="status" lets screen readers announce the freeze
      <section className="freeze-banner" role="status" aria-label="Routine freeze">
        <div>
          <h2>Routine frozen</h2>
          <p>
            Frozen {formatDate(freeze.start_date, today)} through {formatDate(freeze.end_date, today)}.{" "}
            {freeze.shifted_count > 0
              ? `Due dates for ${freeze.shifted_count} unfinished ${freeze.shifted_count === 1 ? "chore was" : "chores were"} pushed back ${freeze.days} ${freeze.days === 1 ? "day" : "days"}.`
              : "No upcoming chores needed new due dates."}{" "}
            Chores that were already late are paused, and missed chores don&apos;t cost points.
          </p>
          <p className="freeze-resume">Normal tracking resumes {formatDate(dayAfter(freeze.end_date), today)}.</p>
        </div>
        <button type="button" className="freeze-end-btn" disabled={saving}
          onClick={() => {
            if (window.confirm("End the freeze now? Pushed back due dates move forward by the days you didn't use, and late chores will be marked late again.")) void onEnd(today);
          }}>
          {saving ? "Saving" : "End freeze"}
        </button>
        {error && <p className="note" role="alert">{error}</p>}
      </section>
    );
  }

  return (
    <section className="freeze-setup" aria-label="Routine freeze">
      {!choosing ? (
        <button type="button" className="freeze-btn" disabled={saving || !today}
          onClick={() => setChoosing(true)}>
          Freeze routine
        </button>
      ) : (
        <form className="freeze-form" onSubmit={submit}>
          <label>
            Freeze through
            <input type="date" required min={today} value={endDate}
              onChange={(event) => setEndDate(event.target.value)} />
          </label>
          <button type="submit" disabled={saving}>{saving ? "Saving" : "Start freeze"}</button>
          <button type="button" className="cancel" onClick={() => { setChoosing(false); setEndDate(""); }}>Cancel</button>
          <p className="freeze-hint">Unfinished chores get their due dates pushed back by the length of the freeze, chores that are already late are paused, and missed chores don&apos;t cost points until it ends.</p>
        </form>
      )}
      {error && <p className="note" role="alert">{error}</p>}
    </section>
  );
}
