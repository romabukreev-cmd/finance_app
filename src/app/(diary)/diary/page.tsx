"use client"

import { useMemo, useState } from "react"
import {
  Bookmark,
  Clock,
  Flame,
  Plus,
  Trash2,
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
      {/* Закладка */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => toggleBookmark(date)}
          className={cn("h-8 w-8", entry.isBookmarked ? "text-amber-500" : "text-muted-foreground")}
        >
          {entry.isBookmarked ? (
            <Flame className="h-4 w-4 fill-current" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </Button>
      </div>

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
            {totalHours}ч
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {workDirections.map((dir) => {
            const log = entry.workLogs.find((w) => w.directionId === dir.id)
            const hours = log?.hours ?? 0
            const colors = DIARY_CATEGORY_COLORS[dir.color] ?? DIARY_CATEGORY_COLORS.slate
            return (
              <div
                key={dir.id}
                className={cn(
                  "flex flex-col items-center rounded-xl border py-2",
                  hours > 0 ? `${colors.bg} ${colors.border}` : "border-border"
                )}
              >
                <span className={cn("text-[10px] font-medium", hours > 0 ? colors.text : "text-muted-foreground")}>
                  {dir.name}
                </span>
                <button
                  type="button"
                  className="mt-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setWorkLog(date, dir.id, Math.min(24, hours + 0.5))}
                >
                  ▲
                </button>
                <span className={cn("text-lg font-bold tabular-nums", hours > 0 ? colors.text : "text-muted-foreground/40")}>
                  {hours}
                </span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setWorkLog(date, dir.id, Math.max(0, hours - 0.5))}
                >
                  ▼
                </button>
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
}: {
  date: string
  isToday: boolean
}) {
  const {
    categories,
    getOrCreateEntry,
    addThought,
    deleteThought,
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
        <CardTitle className={isToday ? "text-2xl" : "text-lg"}>
          {isToday ? "Сегодня" : formatDateRu(date)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          {/* Левая колонка — мысли */}
          <div className="space-y-3">
            {entry.thoughts.map((thought) => (
              <div
                key={thought.id}
                className="group flex gap-3 rounded-xl border bg-card p-3"
              >
                <div className="flex-1 space-y-1.5">
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteThought(date, thought.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
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

/* ────── Главная страница ────── */

export default function DiaryPage() {
  const { hydrated, entries } = useDiary()
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
      <div className="mx-auto max-w-5xl py-20 text-center text-muted-foreground">
        Загрузка...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
        <DayBlock key={date} date={date} isToday={date === today} />
      ))}
    </div>
  )
}
