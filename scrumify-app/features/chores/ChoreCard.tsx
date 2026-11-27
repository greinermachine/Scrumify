// Displays a chore's details, deadline state, and controls for editing or marking it complete
import type { Chore } from "./types";
import { getChoreState } from "./getChoreState";
import { formatDate } from "./formatDate";

type ChoreCardProps = {
  chore: Chore;
  onEdit: () => void;
  onDelete: () => void;
  saving: boolean;
  today: string;
  frozen: boolean;
  penalized: boolean;
  completingId: number | null;
  onComplete: (choreId: number) => Promise<void>;
};

export default function ChoreCard({ chore, onEdit, onDelete, saving, today, frozen, penalized, completingId, onComplete }: ChoreCardProps) {
  const state = getChoreState(chore, today, frozen);
  const overdue = state === "Overdue";
  const paused = state === "Frozen";

  return (
    <li className={overdue ? "chore overdue" : paused ? "chore paused" : "chore"}>
      <h2>{chore.description}</h2>
      <p className="meta">
        <span className={overdue ? "late" : paused ? "paused-label" : undefined}>
          {overdue ? "Late, " : paused ? "Paused, " : ""}
          {formatDate(chore.due_date, today)}
        </span>
        {penalized
          ? <span className="late" title="Missed, so these points are taken away">-{chore.points} pts</span>
          : <span>{chore.points} pts</span>}
      </p>
      <div className="actions">
        {chore.status !== "done" ? (
          <button
            className="complete-btn"
            type="button"
            disabled={saving}
            onClick={() => void onComplete(chore.id)}
            aria-label={`Mark ${chore.description} complete`}
          >
            {completingId === chore.id ? "Saving" : "Mark complete"}
          </button>
        ) : <span />}
        <div className="chore-controls">
          <button className="edit-btn" type="button" onClick={onEdit} disabled={saving} aria-label={`Edit ${chore.description}`}>
            Edit
          </button>
          <button className="delete-btn" type="button" onClick={onDelete} disabled={saving} aria-label={`Delete ${chore.description}`}>
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
