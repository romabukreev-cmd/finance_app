"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { usePlanner } from "@/components/planner/planner-provider"
import type {
  Task,
  TaskStatus,
  TaskPriority,
  PlannerView,
} from "@/lib/planner/types"
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  priorityLabel,
  priorityColor,
  statusLabel,
  formatDuration,
} from "@/lib/planner/types"
import { DEFAULT_WORK_DIRECTIONS, DIARY_CATEGORY_COLORS } from "@/lib/diary/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  DndContext,
  closestCorners,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useDroppable } from "@dnd-kit/core"
import {
  Plus,
  X,
  Calendar,
  Clock,
  Trash2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTodayDate(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

const COLUMN_META: Record<TaskStatus, { label: string; dotColor: string }> = {
  todo: { label: "Очередь", dotColor: "bg-slate-400" },
  in_progress: { label: "Делаю", dotColor: "bg-amber-400" },
  done: { label: "Сделал", dotColor: "bg-emerald-400" },
}

const PRIORITY_BADGE_COLORS: Record<string, string> = {
  red: "bg-red-500/20 text-red-400",
  violet: "bg-violet-500/20 text-violet-400",
  amber: "bg-amber-500/20 text-amber-400",
  emerald: "bg-emerald-500/20 text-emerald-400",
  slate: "bg-slate-500/20 text-slate-400",
  gray: "bg-gray-500/20 text-gray-400",
}

const DOT_COLOR: Record<string, string> = {
  emerald: "bg-emerald-400",
  sky: "bg-sky-400",
  violet: "bg-violet-400",
  orange: "bg-orange-400",
  teal: "bg-teal-400",
  amber: "bg-amber-400",
  red: "bg-red-400",
  slate: "bg-slate-400",
  gray: "bg-gray-400",
}

function getDirectionById(id: string | null) {
  if (!id) return null
  return DEFAULT_WORK_DIRECTIONS.find((d) => d.id === id) ?? null
}

function directionColorClasses(color: string) {
  return DIARY_CATEGORY_COLORS[color] ?? DIARY_CATEGORY_COLORS.slate
}

// ---------------------------------------------------------------------------
// Sortable Task Card
// ---------------------------------------------------------------------------

function SortableTaskCard({
  task,
  onOpenModal,
  hidden,
}: {
  task: Task
  onOpenModal: (task: Task) => void
  hidden?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: task.id,
      animateLayoutChanges: () => false,
    })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: "none",
    opacity: isDragging || hidden ? 0 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-grab active:cursor-grabbing"
      onClick={() => onOpenModal(task)}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onOpenModal={onOpenModal} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Task Card (visual — Notion-like)
// ---------------------------------------------------------------------------

function InlineTimeEditor({ task }: { task: Task }) {
  const { updateTask } = usePlanner()
  const [editing, setEditing] = useState(false)
  const [h, setH] = useState(0)
  const [m, setM] = useState(0)

  const openEditor = (e: React.MouseEvent) => {
    e.stopPropagation()
    setH(Math.floor(task.timerAccumulated / 3600))
    setM(Math.floor((task.timerAccumulated % 3600) / 60))
    setEditing(true)
  }

  const save = () => {
    const total = Math.max(0, h) * 3600 + Math.min(59, Math.max(0, m)) * 60
    if (total !== task.timerAccumulated) {
      updateTask({ id: task.id, timerAccumulated: total })
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          type="number"
          min={0}
          value={h}
          onChange={(e) => setH(Number(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="w-8 bg-muted rounded px-1 py-0.5 text-xs text-center outline-none tabular-nums"
        />
        <span className="text-xs text-muted-foreground">ч</span>
        <input
          type="number"
          min={0}
          max={59}
          value={m}
          onChange={(e) => setM(Number(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && save()}
          onBlur={save}
          className="w-8 bg-muted rounded px-1 py-0.5 text-xs text-center outline-none tabular-nums"
        />
        <span className="text-xs text-muted-foreground">м</span>
      </div>
    )
  }

  return (
    <button
      onClick={openEditor}
      className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors tabular-nums whitespace-nowrap"
    >
      <Clock className="size-3" />
      {task.timerAccumulated > 0 ? formatDuration(task.timerAccumulated) : "0м"}
    </button>
  )
}

function TaskCard({
  task,
  isOverlay,
}: {
  task: Task
  onOpenModal?: (task: Task) => void
  isOverlay?: boolean
}) {
  const direction = getDirectionById(task.directionId)
  const pColor = priorityColor(task.priority)
  const badgeClasses = PRIORITY_BADGE_COLORS[pColor] ?? PRIORITY_BADGE_COLORS.gray

  const doneSubtasks = task.subtasks.filter((s) => s.isDone).length
  const totalSubtasks = task.subtasks.length
  const progressPct = totalSubtasks > 0 ? Math.round((doneSubtasks / totalSubtasks) * 100) : 0

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 space-y-2.5",
        isOverlay && "shadow-2xl ring-2 ring-primary/30 cursor-grabbing"
      )}
    >
      {/* Row 1: Title + time */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-sm leading-tight truncate">
          {task.title}
        </span>
        <InlineTimeEditor task={task} />
      </div>

      {/* Row 2: Direction badge */}
      {direction && (
        <div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium",
              directionColorClasses(direction.color).bg,
              directionColorClasses(direction.color).text
            )}
          >
            {direction.name}
          </span>
        </div>
      )}

      {/* Row 3: Priority badge */}
      <div>
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium",
            badgeClasses
          )}
        >
          {priorityLabel(task.priority)}
        </span>
      </div>

      {/* Row 4: Subtask progress */}
      {totalSubtasks > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckSquare className="size-3" />
              {doneSubtasks}/{totalSubtasks}
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Row 5: Date */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
        <Calendar className="size-3" />
        {task.taskDate}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Droppable Column
// ---------------------------------------------------------------------------

function KanbanColumn({
  status,
  tasks,
  onOpenModal,
  onCreateTask,
  movingIds,
}: {
  status: TaskStatus
  tasks: Task[]
  onOpenModal: (task: Task) => void
  onCreateTask: (status: TaskStatus, title: string) => void
  movingIds: Set<string>
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const [newTitle, setNewTitle] = useState("")

  const meta = COLUMN_META[status]
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && newTitle.trim()) {
      onCreateTask(status, newTitle.trim())
      setNewTitle("")
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl border bg-muted/30 p-3 min-h-[400px] transition-colors",
        isOver && "bg-muted/60 ring-1 ring-primary/20"
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={cn("size-2.5 rounded-full", meta.dotColor)} />
        <span className="text-sm font-medium text-foreground/80">{meta.label}</span>
        <span className="ml-auto text-xs text-muted-foreground">{tasks.length}</span>
      </div>

      {/* Task list */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 flex-1">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} onOpenModal={onOpenModal} hidden={movingIds.has(task.id)} />
          ))}
        </div>
      </SortableContext>

      {/* Footer — new task input */}
      <div className="mt-3 flex items-center gap-1.5">
        <Plus className="size-4 text-muted-foreground/50 shrink-0" />
        <input
          className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/40 outline-none"
          placeholder="Новая задача"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Task Detail Modal
// ---------------------------------------------------------------------------

function TaskModal({
  task,
  open,
  onOpenChange,
}: {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const {
    updateTask,
    deleteTask,
    createSubtask,
    updateSubtask,
    deleteSubtask,
  } = usePlanner()

  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [directionId, setDirectionId] = useState<string | null>(null)
  const [priority, setPriority] = useState<TaskPriority>("normal")
  const [status, setStatus] = useState<TaskStatus>("todo")
  const [taskDate, setTaskDate] = useState("")
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const [showSubtaskInput, setShowSubtaskInput] = useState(false)

  // Manual time input state
  const [timeHours, setTimeHours] = useState(0)
  const [timeMinutes, setTimeMinutes] = useState(0)

  // Sync state when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setNotes(task.notes ?? "")
      setDirectionId(task.directionId)
      setPriority(task.priority)
      setStatus(task.status)
      setTaskDate(task.taskDate)
      setShowSubtaskInput(false)
      setNewSubtaskTitle("")
      // Decompose accumulated seconds into hours and minutes
      const totalSec = task.timerAccumulated
      setTimeHours(Math.floor(totalSec / 3600))
      setTimeMinutes(Math.floor((totalSec % 3600) / 60))
    }
  }, [task?.id, task?.updatedAt])

  if (!task) return null

  const handleSaveField = async (field: string, value: unknown) => {
    await updateTask({ id: task.id, [field]: value })
  }

  const handleTimeChange = async (h: number, m: number) => {
    const clampedH = Math.max(0, h)
    const clampedM = Math.max(0, Math.min(59, m))
    setTimeHours(clampedH)
    setTimeMinutes(clampedM)
    const totalSeconds = clampedH * 3600 + clampedM * 60
    await updateTask({ id: task.id, timerAccumulated: totalSeconds })
  }

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return
    await createSubtask({ taskId: task.id, title: newSubtaskTitle.trim() })
    setNewSubtaskTitle("")
    setShowSubtaskInput(false)
  }

  const handleToggleSubtask = async (subtaskId: string, isDone: boolean) => {
    await updateSubtask({ id: subtaskId, isDone: !isDone })
  }

  const handleDeleteTask = async () => {
    await deleteTask(task.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Задача</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (title.trim() && title !== task.title) handleSaveField("title", title.trim())
            }}
            className="text-base font-semibold"
            placeholder="Название задачи"
          />

          {/* Direction */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Направление</label>
            <Select
              value={directionId ?? ""}
              onValueChange={(v) => {
                const val = v || null
                setDirectionId(val)
                handleSaveField("directionId", val)
              }}
            >
              <SelectTrigger className="w-full" size="sm">
                <SelectValue placeholder="Без направления">
                  {(() => {
                    const dir = DEFAULT_WORK_DIRECTIONS.find((d) => d.id === directionId)
                    if (!dir) return "Без направления"
                    const cc = directionColorClasses(dir.color)
                    return (
                      <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", cc.bg, cc.text)}>
                        {dir.name}
                      </span>
                    )
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Без направления</SelectItem>
                {DEFAULT_WORK_DIRECTIONS.map((d) => {
                  const cc = directionColorClasses(d.color)
                  return (
                    <SelectItem key={d.id} value={d.id}>
                      <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", cc.bg, cc.text)}>
                        {d.name}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Приоритет</label>
            <Select
              value={priority}
              onValueChange={(v) => {
                const val = v as TaskPriority
                setPriority(val)
                handleSaveField("priority", val)
              }}
            >
              <SelectTrigger className="w-full" size="sm">
                <SelectValue>
                  {(() => {
                    const pc = priorityColor(priority)
                    const bc = PRIORITY_BADGE_COLORS[pc] ?? PRIORITY_BADGE_COLORS.gray
                    return (
                      <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", bc)}>
                        {priorityLabel(priority)}
                      </span>
                    )
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TASK_PRIORITIES.map((p) => {
                  const bc = PRIORITY_BADGE_COLORS[p.color] ?? PRIORITY_BADGE_COLORS.gray
                  return (
                    <SelectItem key={p.value} value={p.value}>
                      <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", bc)}>
                        {p.label}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Статус</label>
            <Select
              value={status}
              onValueChange={(v) => {
                const val = v as TaskStatus
                setStatus(val)
                handleSaveField("status", val)
              }}
            >
              <SelectTrigger className="w-full" size="sm">
                <SelectValue>{statusLabel(status)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <span
                      className={cn(
                        "inline-block size-2 rounded-full mr-1.5",
                        COLUMN_META[s.value].dotColor
                      )}
                    />
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Дата</label>
            <Input
              type="date"
              value={taskDate}
              onChange={(e) => {
                setTaskDate(e.target.value)
                handleSaveField("taskDate", e.target.value)
              }}
              className="w-full"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Заметки</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                const val = notes.trim() || null
                if (val !== (task.notes ?? "")) handleSaveField("notes", val)
              }}
              placeholder="Заметки к задаче..."
              className="min-h-[80px]"
            />
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Подзадачи</label>
            {task.subtasks.length > 0 && (
              <div className="space-y-1">
                {task.subtasks
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50 group"
                    >
                      <button
                        className={cn(
                          "size-4 shrink-0 rounded border flex items-center justify-center transition-colors",
                          sub.isDone
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-muted-foreground/30 hover:border-muted-foreground/60"
                        )}
                        onClick={() => handleToggleSubtask(sub.id, sub.isDone)}
                      >
                        {sub.isDone && (
                          <svg
                            className="size-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                      <span
                        className={cn(
                          "flex-1 text-sm",
                          sub.isDone && "line-through text-muted-foreground"
                        )}
                      >
                        {sub.title}
                      </span>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        onClick={() => deleteSubtask(sub.id)}
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {showSubtaskInput ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  className="flex-1 bg-transparent text-sm border-b border-muted-foreground/20 py-1 outline-none placeholder:text-muted-foreground/40"
                  placeholder="Название подзадачи"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddSubtask()
                    if (e.key === "Escape") {
                      setShowSubtaskInput(false)
                      setNewSubtaskTitle("")
                    }
                  }}
                  onBlur={() => {
                    if (!newSubtaskTitle.trim()) {
                      setShowSubtaskInput(false)
                    }
                  }}
                />
                <Button size="xs" variant="ghost" onClick={handleAddSubtask}>
                  <Plus className="size-3.5" />
                </Button>
              </div>
            ) : (
              <button
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowSubtaskInput(true)}
              >
                <Plus className="size-3.5" />
                Добавить подзадачу
              </button>
            )}
          </div>

          {/* Time input (manual) */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-3" />
              Затраченное время
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  value={timeHours}
                  onChange={(e) => {
                    const h = parseInt(e.target.value) || 0
                    setTimeHours(h)
                  }}
                  onBlur={() => handleTimeChange(timeHours, timeMinutes)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTimeChange(timeHours, timeMinutes)
                  }}
                  className="w-16 text-center"
                />
                <span className="text-xs text-muted-foreground">ч</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={timeMinutes}
                  onChange={(e) => {
                    const m = parseInt(e.target.value) || 0
                    setTimeMinutes(m)
                  }}
                  onBlur={() => handleTimeChange(timeHours, timeMinutes)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTimeChange(timeHours, timeMinutes)
                  }}
                  className="w-16 text-center"
                />
                <span className="text-xs text-muted-foreground">мин</span>
              </div>
            </div>
          </div>

          {/* Delete */}
          <div className="pt-2 border-t">
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-1.5"
              onClick={handleDeleteTask}
            >
              <Trash2 className="size-3.5" />
              Удалить задачу
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Shared: compact task card for week/calendar + droppable day column
// ---------------------------------------------------------------------------

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
const MONTH_NAMES = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]

function toIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function DraggableMiniCard({ task, onOpenModal }: { task: Task; onOpenModal: (t: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: task.id,
    animateLayoutChanges: () => false,
  })
  const direction = getDirectionById(task.directionId)
  const pColor = priorityColor(task.priority)
  const badgeClasses = PRIORITY_BADGE_COLORS[pColor] ?? PRIORITY_BADGE_COLORS.gray
  const doneSubtasks = task.subtasks.filter((s) => s.isDone).length
  const totalSubtasks = task.subtasks.length
  const progressPct = totalSubtasks > 0 ? Math.round((doneSubtasks / totalSubtasks) * 100) : 0

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition: "none", opacity: isDragging ? 0 : 1 }}
      className="rounded-lg border bg-card p-2.5 cursor-grab active:cursor-grabbing space-y-1.5"
      onClick={() => onOpenModal(task)}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-xs font-semibold leading-tight truncate">{task.title}</span>
        {task.timerAccumulated > 0 && (
          <span className="shrink-0 flex items-center gap-0.5 text-[10px] text-muted-foreground tabular-nums">
            <Clock className="size-2.5" />{formatDuration(task.timerAccumulated)}
          </span>
        )}
      </div>
      {direction && (() => {
        const cc = directionColorClasses(direction.color)
        return <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-medium", cc.bg, cc.text)}>{direction.name}</span>
      })()}
      <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[9px] font-medium", badgeClasses)}>
        {priorityLabel(task.priority)}
      </span>
      {totalSubtasks > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-[9px] text-muted-foreground">{doneSubtasks}/{totalSubtasks}</span>
        </div>
      )}
    </div>
  )
}

function DroppableDay({
  date, dayLabel, isToday, tasks, onOpenModal, dimmed,
}: {
  date: string; dayLabel: React.ReactNode; isToday: boolean
  tasks: Task[]; onOpenModal: (t: Task) => void; dimmed?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${date}` })
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks])

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-h-[160px] rounded-lg border p-1.5 transition-colors",
        isOver && "bg-muted/50 ring-1 ring-primary/20",
        dimmed && "opacity-30"
      )}
    >
      <div className={cn(
        "text-center py-1 mb-1.5 rounded-md text-xs font-medium",
        isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
      )}>
        {dayLabel}
      </div>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-1.5">
          {tasks.map((t) => (
            <DraggableMiniCard key={t.id} task={t} onOpenModal={onOpenModal} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Week View
// ---------------------------------------------------------------------------

function getWeekDates(offset: number): string[] {
  const now = new Date()
  now.setDate(now.getDate() + offset * 7)
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return toIso(d)
  })
}

function WeekView({ tasks, onOpenModal }: { tasks: Task[]; onOpenModal: (t: Task) => void }) {
  const { updateTask, refetch } = usePlanner()
  const [weekOffset, setWeekOffset] = useState(0)
  const dates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const today = getTodayDate()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const overId = String(over.id)
    const targetDate = overId.startsWith("day-") ? overId.slice(4) : tasks.find((t) => t.id === overId)?.taskDate
    if (!targetDate) return
    const task = tasks.find((t) => t.id === active.id)
    if (!task || task.taskDate === targetDate) return
    await updateTask({ id: task.id, taskDate: targetDate })
    await refetch()
  }, [tasks, updateTask, refetch])

  const first = new Date(dates[0] + "T00:00:00")
  const last = new Date(dates[6] + "T00:00:00")
  const m = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"]
  const label = first.getMonth() === last.getMonth()
    ? `${m[first.getMonth()]} ${first.getFullYear()}`
    : `${m[first.getMonth()]} – ${m[last.getMonth()]} ${last.getFullYear()}`

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setWeekOffset((p) => p - 1)}><ChevronLeft className="size-4" /></Button>
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => setWeekOffset(0)}>Сегодня</Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setWeekOffset((p) => p + 1)}><ChevronRight className="size-4" /></Button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-7 gap-2">
          {dates.map((date, i) => (
            <DroppableDay
              key={date}
              date={date}
              isToday={date === today}
              dayLabel={<><div>{DAY_NAMES[i]}</div><div className="text-lg font-bold">{new Date(date + "T00:00:00").getDate()}</div></>}
              tasks={tasks.filter((t) => t.taskDate === date).sort((a, b) => a.sortOrder - b.sortOrder)}
              onOpenModal={onOpenModal}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>
          {null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Calendar View (same layout as week, but 7 cols × N weeks of month)
// ---------------------------------------------------------------------------

function getCalendarDates(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = (firstDay.getDay() + 6) % 7
  const dates: Array<{ date: string; inMonth: boolean }> = []
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    dates.push({ date: toIso(d), inMonth: false })
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    dates.push({ date: `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`, inMonth: true })
  }
  while (dates.length % 7 !== 0) {
    const d = new Date(year, month + 1, dates.length - startPad - lastDay.getDate() + 1)
    dates.push({ date: toIso(d), inMonth: false })
  }
  return dates
}

function CalendarView({ tasks, onOpenModal }: { tasks: Task[]; onOpenModal: (t: Task) => void }) {
  const { updateTask, refetch } = usePlanner()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const today = getTodayDate()
  const days = useMemo(() => getCalendarDates(year, month), [year, month])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const prevMonth = () => { if (month === 0) { setYear((y) => y - 1); setMonth(11) } else setMonth((m) => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear((y) => y + 1); setMonth(0) } else setMonth((m) => m + 1) }

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return
    const overId = String(over.id)
    const targetDate = overId.startsWith("day-") ? overId.slice(4) : tasks.find((t) => t.id === overId)?.taskDate
    if (!targetDate) return
    const task = tasks.find((t) => t.id === active.id)
    if (!task || task.taskDate === targetDate) return
    await updateTask({ id: task.id, taskDate: targetDate })
    await refetch()
  }, [tasks, updateTask, refetch])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{MONTH_NAMES[month]} {year}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={prevMonth}><ChevronLeft className="size-4" /></Button>
          <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }}>Сегодня</Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={nextMonth}><ChevronRight className="size-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {DAY_NAMES.map((d) => <div key={d} className="py-1 font-medium">{d}</div>)}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-7 gap-2">
          {days.map(({ date, inMonth }) => (
            <DroppableDay
              key={date}
              date={date}
              isToday={date === today}
              dimmed={!inMonth}
              dayLabel={<span>{new Date(date + "T00:00:00").getDate()}</span>}
              tasks={tasks.filter((t) => t.taskDate === date).sort((a, b) => a.sortOrder - b.sortOrder)}
              onOpenModal={onOpenModal}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={null}>{null}</DragOverlay>
      </DndContext>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PlannerPage() {
  const {
    tasks,
    hydrated,
    error,
    createTask,
    reorderTasks,
    refetch,
  } = usePlanner()

  const [view, setView] = useState<PlannerView>("today")
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [movingIds, setMovingIds] = useState<Set<string>>(new Set())

  const todayDate = useMemo(() => getTodayDate(), [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Filter tasks for today view
  const todayTasks = useMemo(
    () => tasks.filter((t) => t.taskDate === todayDate),
    [tasks, todayDate]
  )

  const columnTasks = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
    }
    for (const t of todayTasks) {
      grouped[t.status]?.push(t)
    }
    // Sort each column by sortOrder
    for (const key of Object.keys(grouped) as TaskStatus[]) {
      grouped[key].sort((a, b) => a.sortOrder - b.sortOrder)
    }
    return grouped
  }, [todayTasks])

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  )

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeId) ?? null,
    [tasks, activeId]
  )

  // Open modal
  const handleOpenModal = useCallback((task: Task) => {
    setSelectedTaskId(task.id)
    setModalOpen(true)
  }, [])

  // Create task in column
  const handleCreateTask = useCallback(
    async (status: TaskStatus, title: string) => {
      await createTask({
        title,
        status,
        taskDate: todayDate,
        priority: "normal",
      })
    },
    [createTask, todayDate]
  )

  // Quick add from header
  const handleQuickAdd = useCallback(async () => {
    await createTask({
      title: "Новая задача",
      status: "todo",
      taskDate: todayDate,
      priority: "normal",
    })
  }, [createTask, todayDate])

  // ------ DnD handlers ------

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      const draggedId = active.id as string
      setActiveId(null)

      if (!over) return

      // Hide the card while API call is in flight
      setMovingIds((prev) => new Set(prev).add(draggedId))

      const activeTaskObj = tasks.find((t) => t.id === active.id)
      if (!activeTaskObj) return

      const overId = over.id as string

      // Determine target status: if dropped on a column droppable or on another task
      let targetStatus: TaskStatus | null = null
      if (overId === "todo" || overId === "in_progress" || overId === "done") {
        targetStatus = overId as TaskStatus
      } else {
        // Dropped on/near another task — find that task's status
        const overTask = tasks.find((t) => t.id === overId)
        if (overTask) {
          targetStatus = overTask.status
        }
      }

      if (!targetStatus) return

      const sourceStatus = activeTaskObj.status
      const targetColumn = [...columnTasks[targetStatus]]

      if (sourceStatus === targetStatus) {
        // Reorder within same column
        const oldIndex = targetColumn.findIndex((t) => t.id === active.id)
        const newIndex = targetColumn.findIndex((t) => t.id === overId)
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
          setMovingIds((prev) => { const n = new Set(prev); n.delete(draggedId); return n })
          return
        }

        const reordered = arrayMove(targetColumn, oldIndex, newIndex)
        const items = reordered.map((t, i) => ({
          id: t.id,
          sortOrder: i,
          status: targetStatus as string,
        }))
        await reorderTasks(items)
      } else {
        // Move to different column
        // Insert at the position of the over item, or at end
        const overIndex = targetColumn.findIndex((t) => t.id === overId)
        const insertIndex = overIndex >= 0 ? overIndex : targetColumn.length

        // Build new column with the moved task
        const newColumn = [...targetColumn]
        newColumn.splice(insertIndex, 0, activeTaskObj)

        const items = newColumn.map((t, i) => ({
          id: t.id,
          sortOrder: i,
          status: targetStatus as string,
        }))

        // Also need to update the source column sort orders
        const sourceColumn = columnTasks[sourceStatus].filter(
          (t) => t.id !== active.id
        )
        const sourceItems = sourceColumn.map((t, i) => ({
          id: t.id,
          sortOrder: i,
          status: sourceStatus as string,
        }))

        await reorderTasks([...items, ...sourceItems])
      }

      // Show card again after refetch
      setMovingIds((prev) => {
        const next = new Set(prev)
        next.delete(draggedId)
        return next
      })
    },
    [tasks, columnTasks, reorderTasks]
  )

  // ------ View tabs ------

  const viewTabs: Array<{ key: PlannerView; label: string }> = [
    { key: "today", label: "Сегодня" },
    { key: "week", label: "Неделя" },
    { key: "calendar", label: "Календарь" },
  ]

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground text-sm">Загрузка...</div>
      </div>
    )
  }

  if (error && tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-muted-foreground text-sm text-center">
          Не удалось загрузить задачи.
          <br />
          {error}
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          Повторить
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Задачи на неделю</h1>
        <div className="flex items-center gap-3">
          {/* View tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
            {viewTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  view === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* New task button — icon only, round */}
          <Button
            size="icon"
            className="size-9 rounded-full bg-amber-600 hover:bg-amber-700 text-white border-0"
            onClick={handleQuickAdd}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      {/* Content based on view */}
      {view === "today" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["todo", "in_progress", "done"] as TaskStatus[]).map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={columnTasks[status]}
                onOpenModal={handleOpenModal}
                onCreateTask={handleCreateTask}
                movingIds={movingIds}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div className="w-[300px]">
                <TaskCard
                  task={activeTask}
                  onOpenModal={() => {}}
                  isOverlay
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : view === "week" ? (
        <WeekView tasks={tasks} onOpenModal={handleOpenModal} />
      ) : (
        <CalendarView tasks={tasks} onOpenModal={handleOpenModal} />
      )}

      {/* Task Modal */}
      <TaskModal
        task={selectedTask}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  )
}
