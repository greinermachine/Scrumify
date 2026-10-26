// Displays a chore's details, deadline state, and controls for editing or marking it complete
import type { Chore } from "./types";
import { getChoreState } from "./getChoreState";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type ChoreCardProps = {
  chore: Chore;
  onEdit: () => void;
  saving: boolean;
  today: string;
  completingId: number | null;
  onComplete: (choreId: number) => Promise<void>;
};

function formatDue(iso: string, today: string) {
  const [year, month, day] = iso.split("-");
  const label = `${MONTHS[Number(month) - 1]} ${Number(day)}`;
  if (today && year !== today.slice(0, 4)) return `${label}, ${year}`;
  return label;
}

export default function ChoreCard({ chore, onEdit, saving, today, completingId, onComplete }: ChoreCardProps) {
  const overdue = getChoreState(chore, today) === "Overdue";

  return (
    <li className="chore">
      <h2>{chore.description}</h2>
      <p className="meta">
        <span className={overdue ? "late" : undefined}>
          {overdue ? "Late, " : ""}
          {formatDue(chore.due_date, today)}
        </span>
        <span>{chore.points} pts</span>
      </p>
      <div className="actions">
        {chore.status !== "done" ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void onComplete(chore.id)}
            aria-label={`Mark ${chore.description} complete`}
          >
            {completingId === chore.id ? "Saving" : "Mark complete"}
          </button>
        ) : <span />}
        <button className="remove" type="button" onClick={onEdit} disabled={saving}>
          Edit
        </button>
      </div>
    </li>
  );
}
