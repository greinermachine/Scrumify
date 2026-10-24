// Determines whether a chore is completed, overdue, or active using its deadline and status
import type { Chore } from "./types";

export function getChoreState(chore: Chore, today: string) {
  // Completed chores should never be marked overdue, even if the deadline has passed
  if (chore.status === "done") return "Completed";

  // Both dates use YYYY-MM-DD, so comparing the strings compares calendar dates
  // A chore due today is still active until the next day
  return chore.due_date < today ? "Overdue" : "Active";
}
