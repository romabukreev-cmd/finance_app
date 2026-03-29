"use client"

import { useMemo, useState } from "react"
import {
  Bookmark,
  Clock,
  Flame,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react"
import { useDiary } from "@/components/diary/diary-provider"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DIARY_CATEGORY_COLORS } from "@/lib/diary/constants"
import { todayIsoDate } from "@/lib/finance/format"
import { cn } from "@/lib/utils"

function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|~[^~]+~)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith("~") && part.endsWith("~")) {
      return <span key={i} className="text-muted-foreground/60">{part.slice(1, -1)}</span>
    }
    return part
  })
}

function formatDateRu(iso: string) {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
  })
}

function CategoryBadge({
  name,
  color,
  onClick,
  selected,
}: {
  name: string
  color: string
  onClick?: () => void
  selected?: boolean
}) {
  const colors = DIARY_CATEGORY_COLORS[color] ?? DIARY_CATEGORY_COLORS.slate
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all",
        colors.bg,
        colors.text,
        colors.border,
        selected === false && "opacity-40",
        onClick && "cursor-pointer hover:opacity-100"
      )}
    >
      {name}
    </button>
  )
}

function IconToggle({
  emoji,
  label,
  active,
  type,
  onClick,
}: {
  emoji: string
  label: string
  active: boolean
  type: "buff" | "debuff"
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all",
        active
          ? type === "buff"
            ? "bg-emerald-100 ring-2 ring-emerald-400 dark:bg-emerald-950 dark:ring-emerald-600"
            : "bg-rose-100 ring-2 ring-rose-400 dark:bg-rose-950 dark:ring-rose-600"
          : "bg-muted/50 opacity-35 grayscale hover:opacity-60 hover:grayscale-0"
      )}
    >
      {emoji}
    </button>
  )
}

/* ────── Отдельная мысль (просмотр / редактирование) ────── */

function ThoughtItem({
  thought,
  date,
  categories,
}: {
  thought: { id: string; text: string; categoryIds: string[] }
  date: string
  categories: Array<{ id: string; name: string; color: string }>
}) {
  const { updateThought, deleteThought } = useDiary()
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(thought.text)
  const [editCatIds, setEditCatIds] = useState(thought.categoryIds)

  const startEdit = () => {
    setEditText(thought.text)
    setEditCatIds([...thought.categoryIds])
    setEditing(true)
  }

  const save = () => {
    const trimmed = editText.trim()
    if (!trimmed) return
    updateThought(date, thought.id, trimmed, editCatIds)
    setEditing(false)
  }

  const cancel = () => setEditing(false)

  const toggleCat = (id: string) => {
    setEditCatIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  if (editing) {
    return (
      <div className="space-y-2 rounded-xl border-2 border-primary/30 bg-card p-3">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <CategoryBadge
              key={cat.id}
              name={cat.name}
              color={cat.color}
              selected={editCatIds.includes(cat.id)}
              onClick={() => toggleCat(cat.id)}
            />
          ))}
        </div>
        <textarea
          value={editText}
          onChange={(e) => {
            setEditText(e.target.value)
            const el = e.target
            el.style.height = "auto"
            el.style.height = `${el.scrollHeight}px`
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              save()
            }
            if (e.key === "Escape") cancel()
          }}
          autoFocus
          rows={3}
          className="w-full resize-none overflow-hidden rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={save} className="h-7 text-xs">
            Сохранить
          </Button>
          <Button size="sm" variant="ghost" onClick={cancel} className="h-7 text-xs">
            Отмена
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex gap-3 rounded-xl border bg-card p-3">
      <div
        className="flex-1 cursor-pointer space-y-1.5"
        onClick={startEdit}
      >
        {thought.categoryIds.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {thought.categoryIds.map((catId) => {
              const cat = categories.find((c) => c.id === catId)
              if (!cat) return null
              return (
                <CategoryBadge
                  key={catId}
                  name={cat.name}
                  color={cat.color}
                />
              )
            })}
          </div>
        )}
        <p className="text-sm whitespace-pre-wrap">{renderFormattedText(thought.text)}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1 opacity-0 group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={startEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => deleteThought(date, thought.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

/* ────── Правая колонка (бафы/дебафы/часы) ────── */

function RightPanel({
  date,
  isEditable,
}: {
  date: string
  isEditable?: boolean
}) {
  const {
    workDirections,
    buffs,
    debuffs,
    getOrCreateEntry,
    toggleBuff,
    toggleDebuff,
    toggleBookmark,
    setWorkLog,
  } = useDiary()

  const entry = getOrCreateEntry(date)
  const totalHours = entry.workLogs.reduce((sum, w) => sum + w.hours, 0)

  return (
    <div className="space-y-4">
      {/* Бафы + Дебафы */}
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-1.5">
          <h3 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Бафы</h3>
          <div className="flex flex-wrap gap-1.5">
            {buffs.map((b) => (
              <IconToggle
                key={b.id}
                emoji={b.emoji}
                label={b.name}
                active={entry.activeBuffIds.includes(b.id)}
                type="buff"
                onClick={() => toggleBuff(date, b.id)}
              />
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          <h3 className="text-xs font-semibold text-rose-600 dark:text-rose-400">Дебафы</h3>
          <div className="flex flex-wrap gap-1.5">
            {debuffs.map((d) => (
              <IconToggle
                key={d.id}
                emoji={d.emoji}
                label={d.name}
                active={entry.activeDebuffIds.includes(d.id)}
                type="debuff"
                onClick={() => toggleDebuff(date, d.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Рабочие часы */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground">Рабочие часы</h3>
          <span className="flex items-center gap-1 text-sm font-bold">
            <Clock className="h-3.5 w-3.5" />
            {Math.floor(totalHours)}ч {Math.round((totalHours - Math.floor(totalHours)) * 60)}м
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {workDirections.map((dir) => {
            const log = entry.workLogs.find((w) => w.directionId === dir.id)
            const hours = log?.hours ?? 0
            const colors = DIARY_CATEGORY_COLORS[dir.color] ?? DIARY_CATEGORY_COLORS.slate
            const h = Math.floor(hours)
            const m = Math.round((hours - h) * 60)
            return (
              <div
                key={dir.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border p-2",
                  hours > 0 ? `${colors.bg} ${colors.border}` : "border-border"
                )}
              >
                <span className={cn("min-w-[72px] text-xs font-medium", hours > 0 ? colors.text : "text-muted-foreground")}>
                  {dir.name}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={h || ""}
                    placeholder="0"
                    className="h-7 w-10 rounded-md border border-input bg-transparent text-center text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 dark:bg-input/30"
                    onChange={(e) => {
                      const newH = Math.max(0, Math.min(23, Number(e.target.value) || 0))
                      setWorkLog(date, dir.id, newH + m / 60)
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">ч</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    value={m || ""}
                    placeholder="0"
                    className="h-7 w-10 rounded-md border border-input bg-transparent text-center text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 dark:bg-input/30"
                    onChange={(e) => {
                      const newM = Math.max(0, Math.min(59, Number(e.target.value) || 0))
                      setWorkLog(date, dir.id, h + newM / 60)
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">м</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ────── Блок дня (сегодня + история) ────── */

function DayBlock({
  date,
  isToday,
  onCollapse,
}: {
  date: string
  isToday: boolean
  onCollapse?: () => void
}) {
  const {
    categories,
    getOrCreateEntry,
    addThought,
    deleteThought,
    toggleBookmark,
  } = useDiary()

  const entry = getOrCreateEntry(date)

  const [newText, setNewText] = useState("")
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([])

  const handleAddThought = () => {
    const text = newText.trim()
    if (!text) return
    addThought(date, text, selectedCatIds)
    setNewText("")
    setSelectedCatIds([])
  }

  const toggleCat = (id: string) => {
    setSelectedCatIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  return (
    <Card className={cn(isToday && "border-2 border-primary/20")}>
      <CardHeader>
        <div className="flex items-center justify-between">
          {onCollapse ? (
            <button
              type="button"
              onClick={onCollapse}
              className="text-left hover:opacity-70 transition-opacity"
            >
              <CardTitle className="text-lg">
                {formatDateRu(date)}
              </CardTitle>
            </button>
          ) : (
            <CardTitle className="text-2xl">Сегодня</CardTitle>
          )}
          <button
            type="button"
            onClick={() => toggleBookmark(date)}
            className={cn(
              "transition-all",
              entry.isBookmarked ? "text-amber-500" : "text-muted-foreground/30 hover:text-muted-foreground"
            )}
          >
            {entry.isBookmarked ? (
              <Flame className="h-5 w-5 fill-current" />
            ) : (
              <Bookmark className="h-5 w-5" />
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          {/* Левая колонка — мысли */}
          <div className="space-y-3">
            {entry.thoughts.map((thought) => (
              <ThoughtItem
                key={thought.id}
                thought={thought}
                date={date}
                categories={categories}
              />
            ))}

            {entry.thoughts.length === 0 && !isToday && (
              <p className="text-sm text-muted-foreground/50">Нет записей</p>
            )}

            {/* Ввод новой мысли */}
            <div className="space-y-2 rounded-xl border border-dashed p-3">
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <CategoryBadge
                    key={cat.id}
                    name={cat.name}
                    color={cat.color}
                    selected={selectedCatIds.includes(cat.id)}
                    onClick={() => toggleCat(cat.id)}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <textarea
                  placeholder="Запиши мысль или идею..."
                  value={newText}
                  onChange={(e) => {
                    setNewText(e.target.value)
                    const el = e.target
                    el.style.height = "auto"
                    el.style.height = `${el.scrollHeight}px`
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleAddThought()
                    }
                  }}
                  rows={isToday ? 4 : 2}
                  className="flex-1 resize-none overflow-hidden rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />
                <Button size="icon" onClick={handleAddThought} disabled={!newText.trim()} className="self-end">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Правая колонка */}
          <RightPanel date={date} />
        </div>
      </CardContent>
    </Card>
  )
}

/* ────── Свёрнутый пустой день ────── */

function CollapsedDay({
  date,
  onExpand,
}: {
  date: string
  onExpand: () => void
}) {
  const { getOrCreateEntry, toggleBookmark } = useDiary()
  const entry = getOrCreateEntry(date)

  return (
    <button
      type="button"
      onClick={onExpand}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all hover:bg-muted/50",
        entry.isBookmarked ? "border-amber-300/50 dark:border-amber-700/50" : "border-border"
      )}
    >
      <span className="text-sm font-medium text-muted-foreground">{formatDateRu(date)}</span>
      <div className="flex items-center gap-2">
        {entry.isBookmarked && (
          <Flame className="h-4 w-4 fill-amber-500 text-amber-500" />
        )}
        <span className="text-xs text-muted-foreground/50">развернуть</span>
      </div>
    </button>
  )
}

/* ────── Обёртка дня (свёрнутый/развёрнутый) ────── */

function DayEntry({ date, isToday }: { date: string; isToday: boolean }) {
  const { entries } = useDiary()
  const entry = entries.find((e) => e.date === date)

  const hasContent = entry && (
    entry.thoughts.length > 0 ||
    entry.activeBuffIds.length > 0 ||
    entry.activeDebuffIds.length > 0 ||
    entry.workLogs.some((w) => w.hours > 0) ||
    entry.isBookmarked
  )

  const [expanded, setExpanded] = useState(isToday || !!hasContent)

  if (!expanded) {
    return <CollapsedDay date={date} onExpand={() => setExpanded(true)} />
  }

  return <DayBlock date={date} isToday={isToday} onCollapse={isToday ? undefined : () => setExpanded(false)} />
}

/* ────── Главная страница ────── */

export default function DiaryPage() {
  const { hydrated } = useDiary()
  const today = todayIsoDate()

  const [periodFrom, setPeriodFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })
  const [periodTo, setPeriodTo] = useState(today)

  const allDates = useMemo(() => {
    const dates: string[] = []
    const start = new Date(periodFrom + "T00:00:00")
    const end = new Date(periodTo + "T00:00:00")

    const d = new Date(end)
    while (d >= start) {
      dates.push(d.toISOString().slice(0, 10))
      d.setDate(d.getDate() - 1)
    }
    return dates
  }, [periodFrom, periodTo])

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl py-20 text-center text-muted-foreground">
        Загрузка...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-3">
      <PageHeader
        title="Дневник"
        description="Мысли, привычки и рабочие часы — каждый день."
        actions={
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="h-9 w-[150px] text-sm"
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="h-9 w-[150px] text-sm"
            />
          </div>
        }
      />

      {allDates.map((date) => (
        <DayEntry key={date} date={date} isToday={date === today} />
      ))}
    </div>
  )
}
