// Displays a chore's details, deadline state, and controls for editing or marking it complete
import type { Chore } from "./types";
import { getChoreState } from "./getChoreState";

// Convert the status from DJANGO into the text shown on the page
const statusLabels = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

type ChoreCardProps = {
  chore: Chore;
  onEdit: () => void;
  saving: boolean;
  today: string;
  completingId: number | null;
  onComplete: (choreId: number) => Promise<void>;
};

export default function ChoreCard({ chore, onEdit, saving, today, completingId, onComplete }: ChoreCardProps) {
  // The chore is passed in by ChoresView This component only displays its data
  return (
    <li className="rounded border p-4">
      <h2 className="break-words text-lg font-medium">{chore.description}</h2>
      {today && <p>State: {getChoreState(chore, today)}</p>}
      {chore.status !== "done" && (
        <button
          type="button"
          disabled={saving}
          onClick={() => void onComplete(chore.id)}
          aria-label={`Mark ${chore.description} complete`}
        >
          {completingId === chore.id ? "Saving..." : "Mark complete"}
        </button>
      )}
      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-semibold">Due date</dt>
          <dd><time dateTime={chore.due_date}>{chore.due_date}</time></dd>
        </div>
        <div>
          <dt className="font-semibold">Status</dt>
          <dd>{statusLabels[chore.status]}</dd>
        </div>
        <div>
          <dt className="font-semibold">Points</dt>
          <dd>{chore.points}</dd>
        </div>
      </dl>
      <button className="mt-2 rounded border px-3 py-1" type="button" onClick={onEdit} disabled={saving}>
        Edit
      </button>
    </li>
  );
}
