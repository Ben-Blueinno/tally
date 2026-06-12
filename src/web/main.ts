/**
 * Tally — DOM + persistence layer.
 *
 * Thin renderer over the pure logic in `core.ts`. Responsibilities:
 *  - hold the single `AppState`, load it from / save it to `localStorage`
 *  - render tasks and habits into the DOM
 *  - wire up user input and route every mutation through a `core` function
 *
 * All domain rules (validation, streaks, sorting, ordering) live in `core.ts`.
 */
import {
  addHabit,
  addTask,
  createInitialState,
  dayKey,
  deleteHabit,
  deleteTask,
  deserialize,
  editTask,
  habitStreak,
  isHabitDone,
  serialize,
  sortedTasks,
  toggleHabitToday,
  toggleTask,
  type AppState,
} from "./core.js";

const STORAGE_KEY = "tally.state.v1";

function makeId(): string {
  return crypto.randomUUID();
}

function loadState(): AppState {
  try {
    const restored = deserialize(localStorage.getItem(STORAGE_KEY));
    if (restored) return restored;
  } catch {
    // localStorage can throw (e.g. disabled/private mode); fall through to fresh.
  }
  return createInitialState(makeId);
}

function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, serialize(state));
  } catch {
    // Out of quota / storage disabled — keep the app usable in-memory.
  }
}

// --- App wiring -----------------------------------------------------------

let state: AppState = loadState();

/** The day key for "today", recomputed on each render so streaks stay current. */
function today(): string {
  return dayKey(new Date());
}

/** Apply a state change, persist it, and re-render. */
function update(next: AppState): void {
  state = next;
  saveState(state);
  render();
}

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing required element #${id}`);
  return el as T;
}

// --- Rendering ------------------------------------------------------------

function renderTasks(): void {
  const list = $<HTMLUListElement>("task-list");
  const empty = $<HTMLParagraphElement>("task-empty");
  list.replaceChildren();

  const tasks = sortedTasks(state.tasks);
  empty.hidden = tasks.length > 0;

  for (const task of tasks) {
    const li = document.createElement("li");
    li.className = "row" + (task.done ? " row--done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", task.done ? "Mark incomplete" : "Mark complete");
    checkbox.addEventListener("change", () =>
      update({ ...state, tasks: toggleTask(state.tasks, task.id) }),
    );

    const title = document.createElement("span");
    title.className = "row__title";
    title.textContent = task.title;
    title.title = "Double-click to edit";
    title.addEventListener("dblclick", () => startEditTask(li, task.id, task.title));

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "icon-btn";
    editBtn.textContent = "✎";
    editBtn.setAttribute("aria-label", "Edit task");
    editBtn.addEventListener("click", () => startEditTask(li, task.id, task.title));

    const del = document.createElement("button");
    del.type = "button";
    del.className = "icon-btn icon-btn--danger";
    del.textContent = "✕";
    del.setAttribute("aria-label", "Delete task");
    del.addEventListener("click", () =>
      update({ ...state, tasks: deleteTask(state.tasks, task.id) }),
    );

    li.append(checkbox, title, editBtn, del);
    list.append(li);
  }
}

/** Swap a task's title label for an inline text input. */
function startEditTask(li: HTMLLIElement, id: string, current: string): void {
  const title = li.querySelector(".row__title");
  if (!title) return;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "row__edit";
  input.value = current;

  const commit = () => update({ ...state, tasks: editTask(state.tasks, id, input.value) });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") commit();
    else if (e.key === "Escape") render(); // discard
  });
  input.addEventListener("blur", commit);

  title.replaceWith(input);
  input.focus();
  input.select();
}

function renderHabits(): void {
  const list = $<HTMLUListElement>("habit-list");
  const empty = $<HTMLParagraphElement>("habit-empty");
  const t = today();
  list.replaceChildren();

  empty.hidden = state.habits.length > 0;

  for (const habit of state.habits) {
    const done = isHabitDone(habit, t);
    const streak = habitStreak(habit, t);

    const li = document.createElement("li");
    li.className = "row habit" + (done ? " row--done" : "");

    const name = document.createElement("span");
    name.className = "row__title";
    name.textContent = habit.name;

    const streakBadge = document.createElement("span");
    streakBadge.className = "streak" + (streak > 0 ? " streak--active" : "");
    streakBadge.textContent = `🔥 ${streak}`;
    streakBadge.title = streak === 1 ? "1 day streak" : `${streak} day streak`;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "habit-toggle" + (done ? " habit-toggle--done" : "");
    toggle.textContent = done ? "Done today ✓" : "Mark done";
    toggle.setAttribute("aria-pressed", String(done));
    toggle.addEventListener("click", () =>
      update({ ...state, habits: toggleHabitToday(state.habits, habit.id, t) }),
    );

    const del = document.createElement("button");
    del.type = "button";
    del.className = "icon-btn icon-btn--danger";
    del.textContent = "✕";
    del.setAttribute("aria-label", "Delete habit");
    del.addEventListener("click", () =>
      update({ ...state, habits: deleteHabit(state.habits, habit.id) }),
    );

    li.append(name, streakBadge, toggle, del);
    list.append(li);
  }
}

function render(): void {
  renderTasks();
  renderHabits();
}

// --- Input wiring ---------------------------------------------------------

function wireForms(): void {
  const taskForm = $<HTMLFormElement>("task-form");
  const taskInput = $<HTMLInputElement>("task-input");
  taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    update({ ...state, tasks: addTask(state.tasks, makeId(), taskInput.value, Date.now()) });
    taskInput.value = "";
    taskInput.focus();
  });

  const habitForm = $<HTMLFormElement>("habit-form");
  const habitInput = $<HTMLInputElement>("habit-input");
  habitForm.addEventListener("submit", (e) => {
    e.preventDefault();
    update({ ...state, habits: addHabit(state.habits, makeId(), habitInput.value) });
    habitInput.value = "";
    habitInput.focus();
  });
}

wireForms();
render();
