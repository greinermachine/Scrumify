// Helpers for working out whether a freeze is active and when tracking resumes
import type { Freeze } from "./types";

// Both dates use YYYY-MM-DD, so comparing the strings compares calendar dates
export function isFreezeActive(freeze: Freeze | null, today: string) {
  if (!freeze || !today) return false;
  return freeze.start_date <= today && today <= freeze.end_date;
}

// Tracking resumes the day after the freeze ends
export function dayAfter(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  // Using local dates avoids time zone shifts, and Date rolls over to the next month or year
  const next = new Date(year, month - 1, day + 1);
  return [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, "0"),
    String(next.getDate()).padStart(2, "0"),
  ].join("-");
}
