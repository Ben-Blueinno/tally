import { describe, expect, it } from "vitest";
import {
  addHabit,
  addTask,
  createInitialState,
  deleteHabit,
  deleteTask,
  deserialize,
  editTask,
  greeting,
  habitStreak,
  isHabitDone,
  serialize,
  shiftDay,
  sortedTasks,
  STATE_VERSION,
  toggleHabitToday,
  toggleTask,
  type Habit,
} from "../src/web/core.js";

// A deterministic id generator so tests don't depend on crypto.randomUUID().
function idGen() {
  let n = 0;
  return () => `id-${++n}`;
}

describe("date helpers", () => {
  it("shiftDay moves forward and backward across month boundaries", () => {
    expect(shiftDay("2026-06-12", -1)).toBe("2026-06-11");
    expect(shiftDay("2026-06-01", -1)).toBe("2026-05-31");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28"); // 2026 is not a leap year
  });

  it("greeting picks the right phrase for the local hour", () => {
    const at = (hour: number) => greeting(new Date(2026, 5, 14, hour, 0, 0));

    // Morning: 05:00–11:59
    expect(at(5)).toBe("Good morning");
    expect(at(8)).toBe("Good morning");
    expect(at(11)).toBe("Good morning");

    // Afternoon: 12:00–16:59
    expect(at(12)).toBe("Good afternoon");
    expect(at(16)).toBe("Good afternoon");

    // Evening: 17:00–20:59
    expect(at(17)).toBe("Good evening");
    expect(at(20)).toBe("Good evening");

    // Night: 21:00–04:59 (wraps past midnight)
    expect(at(21)).toBe("Good night");
    expect(at(0)).toBe("Good night");
    expect(at(4)).toBe("Good night");
  });
});

describe("tasks", () => {
  it("adds a trimmed task and ignores empty/whitespace titles", () => {
    let tasks = addTask([], "t1", "  Buy milk  ", 1);
    expect(tasks).toEqual([{ id: "t1", title: "Buy milk", done: false, createdAt: 1 }]);

    tasks = addTask(tasks, "t2", "   ", 2);
    expect(tasks).toHaveLength(1); // whitespace-only rejected
  });

  it("toggles, edits, and deletes by id without mutating input", () => {
    const original = addTask([], "t1", "Task", 1);
    const toggled = toggleTask(original, "t1");
    expect(toggled[0].done).toBe(true);
    expect(original[0].done).toBe(false); // original untouched

    const edited = editTask(toggled, "t1", "Renamed");
    expect(edited[0].title).toBe("Renamed");
    expect(editTask(edited, "t1", "  ")[0].title).toBe("Renamed"); // empty edit is a no-op

    expect(deleteTask(edited, "t1")).toEqual([]);
  });

  it("sorts incomplete tasks before complete ones, then by createdAt", () => {
    let tasks = addTask([], "a", "A", 1);
    tasks = addTask(tasks, "b", "B", 2);
    tasks = addTask(tasks, "c", "C", 3);
    tasks = toggleTask(tasks, "a"); // complete the earliest
    expect(sortedTasks(tasks).map((t) => t.id)).toEqual(["b", "c", "a"]);
  });
});

describe("habits", () => {
  it("seeds default habits with unique ids", () => {
    const state = createInitialState(idGen());
    expect(state.habits.length).toBeGreaterThanOrEqual(1);
    expect(state.tasks).toEqual([]);
    const ids = new Set(state.habits.map((h) => h.id));
    expect(ids.size).toBe(state.habits.length);
  });

  it("toggles today's completion on and off", () => {
    const today = "2026-06-12";
    let habits = addHabit([], "h1", "Read");
    habits = toggleHabitToday(habits, "h1", today);
    expect(isHabitDone(habits[0], today)).toBe(true);

    habits = toggleHabitToday(habits, "h1", today);
    expect(isHabitDone(habits[0], today)).toBe(false);
    expect(habits[0].completedDates).toEqual([]);
  });

  it("adds and deletes habits", () => {
    const habits = addHabit([], "h1", "  Meditate  ");
    expect(habits[0].name).toBe("Meditate");
    expect(addHabit(habits, "h2", "  ")).toHaveLength(1); // empty rejected
    expect(deleteHabit(habits, "h1")).toEqual([]);
  });
});

describe("habitStreak", () => {
  const today = "2026-06-12";
  const make = (dates: string[]): Habit => ({ id: "h", name: "x", completedDates: dates });

  it("is 0 with no completions", () => {
    expect(habitStreak(make([]), today)).toBe(0);
  });

  it("counts today plus consecutive prior days", () => {
    expect(habitStreak(make(["2026-06-12", "2026-06-11", "2026-06-10"]), today)).toBe(3);
  });

  it("keeps a streak alive when today is not yet done but yesterday was", () => {
    expect(habitStreak(make(["2026-06-11", "2026-06-10"]), today)).toBe(2);
  });

  it("is broken (0) when the most recent completion is older than yesterday", () => {
    expect(habitStreak(make(["2026-06-10", "2026-06-09"]), today)).toBe(0);
  });

  it("ignores gaps before the current run", () => {
    expect(habitStreak(make(["2026-06-12", "2026-06-11", "2026-06-08"]), today)).toBe(2);
  });

  it("is unaffected by the order completions were recorded in", () => {
    expect(habitStreak(make(["2026-06-10", "2026-06-12", "2026-06-11"]), today)).toBe(3);
  });
});

describe("persistence", () => {
  it("round-trips state through serialize/deserialize", () => {
    let state = createInitialState(idGen());
    state = { ...state, tasks: addTask(state.tasks, "t1", "Persist me", 1) };
    const restored = deserialize(serialize(state));
    expect(restored).toEqual(state);
  });

  it("returns null for missing, malformed, or version-mismatched data", () => {
    expect(deserialize(null)).toBeNull();
    expect(deserialize("not json")).toBeNull();
    expect(deserialize(JSON.stringify({ version: STATE_VERSION + 1, state: {} }))).toBeNull();
    expect(deserialize(JSON.stringify({ version: STATE_VERSION }))).toBeNull();
    expect(
      deserialize(JSON.stringify({ version: STATE_VERSION, state: { tasks: "no", habits: [] } })),
    ).toBeNull();
  });
});
