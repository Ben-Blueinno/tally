/**
 * Tally core — pure, framework-free domain logic.
 *
 * This module holds the data model and every state transition as pure
 * functions. It intentionally has no DOM, no `localStorage`, and no `Date.now()`
 * calls: the "current day" is always passed in by the caller. That keeps this
 * file trivially unit-testable (see `test/tally.test.ts`) and reusable from both
 * the browser (`main.ts`) and Node (tests). It is the source of truth for the
 * app's behaviour; the DOM layer is a thin renderer over these functions.
 */

/** A single task in today's list. */
export interface Task {
  id: string;
  title: string;
  done: boolean;
  /** Epoch millis; used only for stable ordering. */
  createdAt: number;
}

/** A daily habit. Completion is recorded as a set of `YYYY-MM-DD` day keys. */
export interface Habit {
  id: string;
  name: string;
  /** Day keys (`YYYY-MM-DD`) on which the habit was marked done. */
  completedDates: string[];
}

/** The full persisted application state. */
export interface AppState {
  tasks: Task[];
  habits: Habit[];
}

/** Bumped when the persisted shape changes incompatibly. */
export const STATE_VERSION = 1;

/** Seed habits shown on a user's very first visit. */
const DEFAULT_HABIT_NAMES = ["Drink water", "Move 30 min", "Read"] as const;

/** A fresh state for a first-time user, with a few starter habits. */
export function createInitialState(makeId: () => string): AppState {
  return {
    tasks: [],
    habits: DEFAULT_HABIT_NAMES.map((name) => ({
      id: makeId(),
      name,
      completedDates: [],
    })),
  };
}

// ---------------------------------------------------------------------------
// Date helpers — all operate on local-time `YYYY-MM-DD` day keys.
// ---------------------------------------------------------------------------

/** Format a `Date` as a local-time `YYYY-MM-DD` key. */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Return the day key `n` days offset from the given `YYYY-MM-DD` key. */
export function shiftDay(key: string, n: number): string {
  const [y, m, d] = key.split("-").map(Number);
  // Construct at local noon to stay clear of DST midnight edge cases.
  const date = new Date(y, m - 1, d + n, 12, 0, 0, 0);
  return dayKey(date);
}

// ---------------------------------------------------------------------------
// Task transitions — each returns a new array (never mutates the input).
// ---------------------------------------------------------------------------

export function addTask(tasks: Task[], id: string, title: string, createdAt: number): Task[] {
  const trimmed = title.trim();
  if (trimmed === "") return tasks;
  return [...tasks, { id, title: trimmed, done: false, createdAt }];
}

export function editTask(tasks: Task[], id: string, title: string): Task[] {
  const trimmed = title.trim();
  // An empty edit is treated as a no-op rather than silently blanking the task.
  if (trimmed === "") return tasks;
  return tasks.map((t) => (t.id === id ? { ...t, title: trimmed } : t));
}

export function toggleTask(tasks: Task[], id: string): Task[] {
  return tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
}

export function deleteTask(tasks: Task[], id: string): Task[] {
  return tasks.filter((t) => t.id !== id);
}

/** Tasks ordered for display: incomplete first, then by creation time. */
export function sortedTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.createdAt - b.createdAt;
  });
}

// ---------------------------------------------------------------------------
// Habit transitions.
// ---------------------------------------------------------------------------

export function addHabit(habits: Habit[], id: string, name: string): Habit[] {
  const trimmed = name.trim();
  if (trimmed === "") return habits;
  return [...habits, { id, name: trimmed, completedDates: [] }];
}

export function deleteHabit(habits: Habit[], id: string): Habit[] {
  return habits.filter((h) => h.id !== id);
}

/** Toggle whether `habit` is marked done on `today` (a `YYYY-MM-DD` key). */
export function toggleHabitToday(habits: Habit[], id: string, today: string): Habit[] {
  return habits.map((h) => {
    if (h.id !== id) return h;
    const done = h.completedDates.includes(today);
    return {
      ...h,
      completedDates: done
        ? h.completedDates.filter((d) => d !== today)
        : [...h.completedDates, today],
    };
  });
}

/** Whether the habit is marked done on the given day. */
export function isHabitDone(habit: Habit, today: string): boolean {
  return habit.completedDates.includes(today);
}

/**
 * Current streak length for a habit, relative to `today`.
 *
 * The streak is the run of consecutive completed days ending on the most recent
 * "live" day: today if it's done, otherwise yesterday if it's done. If neither
 * today nor yesterday is completed, the streak is broken and the count is 0.
 * This means a streak stays visible on a new day until it's either extended
 * (mark today done) or lost (a full day passes with nothing logged).
 */
export function habitStreak(habit: Habit, today: string): number {
  const done = new Set(habit.completedDates);
  let anchor: string;
  if (done.has(today)) {
    anchor = today;
  } else if (done.has(shiftDay(today, -1))) {
    anchor = shiftDay(today, -1);
  } else {
    return 0;
  }

  let count = 0;
  let cursor = anchor;
  while (done.has(cursor)) {
    count += 1;
    cursor = shiftDay(cursor, -1);
  }
  return count;
}

// ---------------------------------------------------------------------------
// Persistence (de)serialization — pure; the caller owns the actual storage.
// ---------------------------------------------------------------------------

interface PersistedEnvelope {
  version: number;
  state: AppState;
}

/** Serialize state to a JSON string suitable for `localStorage`. */
export function serialize(state: AppState): string {
  const envelope: PersistedEnvelope = { version: STATE_VERSION, state };
  return JSON.stringify(envelope);
}

/**
 * Parse a previously-serialized string back into state, tolerating anything
 * malformed or from an incompatible version by returning `null` so the caller
 * can fall back to a fresh state instead of throwing.
 */
export function deserialize(raw: string | null): AppState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedEnvelope>;
    if (!parsed || parsed.version !== STATE_VERSION || !parsed.state) return null;
    const { tasks, habits } = parsed.state;
    if (!Array.isArray(tasks) || !Array.isArray(habits)) return null;
    return { tasks, habits };
  } catch {
    return null;
  }
}
