"use client";

import type { Reminder } from "./types";
import type { Chore } from "../chores/types";

type ReminderPopupProps = {
  reminders: Reminder[];
  chores: Chore[];
  onClose: () => void;
};

export default function ReminderPopup({
  reminders,
  chores,
  onClose,
}: ReminderPopupProps) {
  const reminderChores = reminders
    .map((reminder) =>
      chores.find((chore) => chore.id === reminder.chore)
    )
    .filter(
      (chore): chore is Chore =>
        chore !== undefined && chore.status !== "done"
    );

  return (
    <div className="reminder-popup-overlay">
      <div
        className="reminder-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-popup-title"
      >
        <div className="reminder-popup-header">
          <div>
            <h2 id="reminder-popup-title">Your reminders</h2>
            <p>
              {reminderChores.length} upcoming{" "}
              {reminderChores.length === 1
                ? "reminder"
                : "reminders"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close reminders"
          >
            ×
          </button>
        </div>

        <div className="reminder-popup-content">
          {reminderChores.length === 0 ? (
            <p>No upcoming reminders. You're all caught up!</p>
          ) : (
            reminderChores.map((chore) => (
              <div key={chore.id} className="reminder-item">
                <div className="reminder-item-icon">🔔</div>

                <div>
                  <h3>{chore.description}</h3>
                  <p>
                    Due{" "}
                    {new Date(
                      `${chore.due_date}T00:00:00`
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
