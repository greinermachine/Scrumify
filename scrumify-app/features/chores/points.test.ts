// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { getPoints, isPenalized } from "./points.ts";
import type { Chore } from "./types";

let nextId = 1;
function chore(due_date: string, points: number, status: Chore["status"] = "todo"): Chore {
  return { id: nextId++, description: "Chore", due_date, status, points };
}

const TODAY = "2026-11-20";

test("completed chores add points", () => {
  const result = getPoints([chore("2026-11-10", 3, "done"), chore("2026-11-25", 5, "done")], TODAY, false, []);
  assert.deepEqual(result, { earned: 8, penalty: 0, missed: 0, total: 8 });
});

test("a missed chore costs its points when not frozen", () => {
  const result = getPoints([chore("2026-11-10", 5, "done"), chore("2026-11-15", 3)], TODAY, false, []);
  assert.deepEqual(result, { earned: 5, penalty: 3, missed: 1, total: 2 });
});

test("chores due today or later are not missed", () => {
  const result = getPoints([chore(TODAY, 3), chore("2026-11-30", 4, "in_progress")], TODAY, false, []);
  assert.equal(result.penalty, 0);
});

test("missed chores cost nothing while a freeze is active", () => {
  const freezes = [{ start_date: "2026-11-18", end_date: "2026-11-24" }];
  // One was late before the freeze started, one was due during it
  const result = getPoints([chore("2026-11-12", 3), chore("2026-11-19", 4)], TODAY, true, freezes);
  assert.deepEqual(result, { earned: 0, penalty: 0, missed: 0, total: 0 });
});

test("after a freeze ends, chores due during it still cost nothing", () => {
  const freezes = [{ start_date: "2026-11-10", end_date: "2026-11-14" }];
  const duringFreeze = chore("2026-11-12", 3);
  assert.equal(isPenalized(duringFreeze, TODAY, false, freezes), false);
});

test("after a freeze ends, chores missed outside it cost points again", () => {
  const freezes = [{ start_date: "2026-11-10", end_date: "2026-11-14" }];
  const before = chore("2026-11-08", 2);
  const after = chore("2026-11-16", 4);
  const result = getPoints([before, after], TODAY, false, freezes);
  assert.deepEqual(result, { earned: 0, penalty: 6, missed: 2, total: -6 });
});

test("freeze dates include both the first and last day", () => {
  const freezes = [{ start_date: "2026-11-10", end_date: "2026-11-14" }];
  assert.equal(isPenalized(chore("2026-11-10", 1), TODAY, false, freezes), false);
  assert.equal(isPenalized(chore("2026-11-14", 1), TODAY, false, freezes), false);
  assert.equal(isPenalized(chore("2026-11-09", 1), TODAY, false, freezes), true);
  assert.equal(isPenalized(chore("2026-11-15", 1), TODAY, false, freezes), true);
});

test("completed chores are never penalized", () => {
  assert.equal(isPenalized(chore("2026-11-01", 5, "done"), TODAY, false, []), false);
});

test("nothing is penalized before the browser date is known", () => {
  assert.equal(getPoints([chore("2026-11-01", 5)], "", false, []).penalty, 0);
});
