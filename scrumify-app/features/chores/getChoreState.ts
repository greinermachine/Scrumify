// Determines whether a chore is completed, overdue, frozen, or active using its deadline and status
import type { Chore } from "./types";

export function getChoreState(chore: Chore, today: string, frozen = false) {
  // Completed chores should never be marked overdue, even if the deadline has passed
  if (chore.status === "done") return "Completed";

  // Both dates use YYYY-MM-DD, so comparing the strings compares calendar dates
  // A chore due today is still active until the next day
  const pastDue = chore.due_date < today;

  // While the routine is frozen, late chores are paused instead of overdue
  if (pastDue && frozen) return "Frozen";
  return pastDue ? "Overdue" : "Active";
}
