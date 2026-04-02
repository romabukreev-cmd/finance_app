export type TaskStatus = "todo" | "in_progress" | "done"
export type TaskPriority = "urgent" | "key" | "important" | "regular" | "normal"
export type PlannerView = "today" | "week" | "calendar"

export type Task = {
  id: string
  title: string
  notes: string | null
  status: TaskStatus
  priority: TaskPriority
  directionId: string | null
  taskDate: string // YYYY-MM-DD
  sortOrder: number
  timerStartedAt: string | null // ISO timestamp, null = not running
  timerAccumulated: number // seconds from previous runs
  timerIsRunning: boolean
  createdAt: string
  updatedAt: string
  subtasks: Subtask[]
}

export type Subtask = {
  id: string
  taskId: string
  title: string
  isDone: boolean
  sortOrder: number
  createdAt: string
}

export type CreateTaskInput = {
  title: string
  status?: TaskStatus
  priority?: TaskPriority
  directionId?: string | null
  taskDate?: string
  notes?: string
}

export type UpdateTaskInput = {
  id: string
  title?: string
  notes?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  directionId?: string | null
  taskDate?: string
  sortOrder?: number
}

export type CreateSubtaskInput = {
  taskId: string
  title: string
}

export type UpdateSubtaskInput = {
  id: string
  title?: string
  isDone?: boolean
  sortOrder?: number
}

export const TASK_STATUSES: Array<{ value: TaskStatus; label: string; color: string }> = [
  { value: "todo", label: "Очередь", color: "slate" },
  { value: "in_progress", label: "Делаю", color: "amber" },
  { value: "done", label: "Сделал", color: "emerald" },
]

export const TASK_PRIORITIES: Array<{ value: TaskPriority; label: string; color: string }> = [
  { value: "urgent", label: "Горит", color: "red" },
  { value: "key", label: "Ключевая", color: "violet" },
  { value: "important", label: "Важная", color: "amber" },
  { value: "regular", label: "Регулярная", color: "slate" },
  { value: "normal", label: "Обычная", color: "gray" },
]

export function priorityLabel(p: TaskPriority) {
  return TASK_PRIORITIES.find((x) => x.value === p)?.label ?? p
}

export function priorityColor(p: TaskPriority) {
  return TASK_PRIORITIES.find((x) => x.value === p)?.color ?? "gray"
}

export function statusLabel(s: TaskStatus) {
  return TASK_STATUSES.find((x) => x.value === s)?.label ?? s
}

/** Total timer seconds including current running segment */
export function taskTimerSeconds(task: Task): number {
  if (!task.timerIsRunning || !task.timerStartedAt) {
    return task.timerAccumulated
  }
  const elapsed = Math.floor((Date.now() - new Date(task.timerStartedAt).getTime()) / 1000)
  return task.timerAccumulated + Math.max(0, elapsed)
}

/** Format seconds as "Xч Yм" */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h === 0 && m === 0) return "0м"
  if (h === 0) return `${m}м`
  if (m === 0) return `${h}ч`
  return `${h}ч ${m}м`
}

/** Format seconds as "H:MM:SS" for running timer display */
export function formatTimerDisplay(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}
