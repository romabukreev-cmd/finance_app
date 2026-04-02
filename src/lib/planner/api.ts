import type {
  Task,
  Subtask,
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubtaskInput,
  UpdateSubtaskInput,
} from "./types"

const BASE = "/api"

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || res.statusText)
  }
  return res.json()
}

export const plannerApi = {
  tasks: {
    list: () => json<Task[]>(`${BASE}/tasks`),
    create: (input: CreateTaskInput) =>
      json<Task>(`${BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    update: (input: UpdateTaskInput) =>
      json<Task>(`${BASE}/tasks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    delete: (id: string) =>
      json(`${BASE}/tasks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }),
    reorder: (items: Array<{ id: string; sortOrder: number; status?: string }>) =>
      json(`${BASE}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      }),
  },
  subtasks: {
    create: (input: CreateSubtaskInput) =>
      json<Subtask>(`${BASE}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    update: (input: UpdateSubtaskInput) =>
      json<Subtask>(`${BASE}/subtasks`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    delete: (id: string) =>
      json(`${BASE}/subtasks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }),
  },
  timer: {
    start: (taskId: string) =>
      json<Task>(`${BASE}/timer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", taskId }),
      }),
    pause: (taskId: string) =>
      json<Task>(`${BASE}/timer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause", taskId }),
      }),
    stop: (taskId: string) =>
      json<Task>(`${BASE}/timer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop", taskId }),
      }),
  },
}
