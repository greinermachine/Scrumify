// Works out the user's points: earned from completed chores, minus penalties for missed chores
// A missed chore costs its own point value, unless a freeze covers it
import { getChoreState } from "./getChoreState.ts";
import type { Chore, FreezeWindow } from "./types";

// Both dates use YYYY-MM-DD, so comparing the strings compares calendar dates
function dueDuringFreeze(chore: Chore, freezes: FreezeWindow[]) {
  return freezes.some((freeze) => freeze.start_date <= chore.due_date && chore.due_date <= freeze.end_date);
}

export function isPenalized(chore: Chore, today: string, frozen: boolean, freezes: FreezeWindow[]) {
  // While a freeze is active, getChoreState reports late chores as Frozen instead of Overdue,
  // so nothing is penalized until the freeze ends
  if (getChoreState(chore, today, frozen) !== "Overdue") return false;
  // A chore that was due during a freeze, past or current, was never missed
  return !dueDuringFreeze(chore, freezes);
}

export function getPoints(chores: Chore[], today: string, frozen: boolean, freezes: FreezeWindow[]) {
  let earned = 0;
  let penalty = 0;
  let missed = 0;
  for (const chore of chores) {
    if (chore.status === "done") {
      earned += chore.points;
    } else if (isPenalized(chore, today, frozen, freezes)) {
      penalty += chore.points;
      missed += 1;
    }
  }
  return { earned, penalty, missed, total: earned - penalty };
}
