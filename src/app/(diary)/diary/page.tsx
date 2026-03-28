"use client"

import { useMemo, useState } from "react"
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
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

function TodayBlock() {
  const {
    categories,
    workDirections,
    buffs,
    debuffs,
    getOrCreateEntry,
    addThought,
    deleteThought,
    toggleBuff,
    toggleDebuff,
    toggleBookmark,
    setWorkLog,
  } = useDiary()

  const today = todayIsoDate()
  const entry = getOrCreateEntry(today)

  const [newText, setNewText] = useState("")
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>([])

  const handleAddThought = () => {
    const text = newText.trim()
    if (!text) return
    addThought(today, text, selectedCatIds)
    setNewText("")
    setSelectedCatIds([])
  }

  const toggleCat = (id: string) => {
    setSelectedCatIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const totalHours = entry.workLogs.reduce((sum, w) => sum + w.hours, 0)

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Сегодня</CardTitle>
            <p className="text-sm text-muted-foreground">{formatDateRu(today)}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleBookmark(today)}
            className={entry.isBookmarked ? "text-amber-500" : "text-muted-foreground"}
          >
            {entry.isBookmarked ? (
              <Flame className="h-5 w-5 fill-current" />
            ) : (
              <Bookmark className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          {/* Левая колонка — мысли */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Мысли и идеи</h3>

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
                  onClick={() => deleteThought(today, thought.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {/* Новая мысль */}
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
                  rows={4}
                  className="flex-1 resize-none overflow-hidden rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                />
                <Button size="icon" onClick={handleAddThought} disabled={!newText.trim()} className="self-end">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Правая колонка — бафы, дебафы, часы */}
          <div className="space-y-5">
            {/* Бафы + Дебафы */}
            <div className="space-y-3">
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
                        onClick={() => toggleBuff(today, b.id)}
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
                        onClick={() => toggleDebuff(today, d.id)}
                      />
                    ))}
                  </div>
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
              <div className="grid grid-cols-2 gap-1.5">
                {workDirections.map((dir) => {
                  const log = entry.workLogs.find((w) => w.directionId === dir.id)
                  const hours = log?.hours ?? 0
                  const colors = DIARY_CATEGORY_COLORS[dir.color] ?? DIARY_CATEGORY_COLORS.slate
                  return (
                    <div
                      key={dir.id}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2",
                        hours > 0 ? `${colors.bg} ${colors.border}` : "border-border"
                      )}
                    >
                      <span className={cn("text-xs font-medium truncate", hours > 0 ? colors.text : "text-muted-foreground")}>
                        {dir.name}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={hours || ""}
                        placeholder="0"
                        className="ml-auto h-7 w-14 text-center text-xs"
                        onChange={(e) => setWorkLog(today, dir.id, Number(e.target.value) || 0)}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ────────── Календарь ────────── */

function CalendarView() {
  const { entries, categories, buffs, debuffs, workDirections } = useDiary()
  const today = todayIsoDate()

  const [viewMonth, setViewMonth] = useState(() => today.slice(0, 7))

  const [year, month] = viewMonth.split("-").map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7 // Monday = 0

  const monthLabel = new Date(year, month - 1).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  })

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1)
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const nextMonth = () => {
    const d = new Date(year, month, 1)
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const entryMap = useMemo(() => {
    const map = new Map<string, typeof entries[number]>()
    for (const e of entries) map.set(e.date, e)
    return map
  }, [entries])

  const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-muted-foreground">Календарь</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center text-sm font-medium capitalize">
            {monthLabel}
          </span>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}

        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${viewMonth}-${String(day).padStart(2, "0")}`
          const entry = entryMap.get(dateStr)
          const isToday = dateStr === today
          const hasContent = entry && (entry.thoughts.length > 0 || entry.activeBuffIds.length > 0 || entry.activeDebuffIds.length > 0 || entry.workLogs.length > 0)
          const totalHours = entry?.workLogs.reduce((s, w) => s + w.hours, 0) ?? 0
          const activeBuffCount = entry?.activeBuffIds.length ?? 0
          const activeDebuffCount = entry?.activeDebuffIds.length ?? 0

          return (
            <div
              key={day}
              className={cn(
                "min-h-[80px] rounded-lg border p-1.5 text-xs transition-all",
                isToday
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                  : hasContent
                    ? "border-border bg-card"
                    : "border-transparent bg-muted/20"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  "font-medium",
                  isToday ? "text-primary font-bold" : "text-muted-foreground"
                )}>
                  {day}
                </span>
                {entry?.isBookmarked && (
                  <Flame className="h-3 w-3 fill-amber-500 text-amber-500" />
                )}
              </div>

              {hasContent && (
                <div className="mt-1 space-y-0.5">
                  {/* Категории мыслей */}
                  {entry.thoughts.length > 0 && (
                    <div className="flex flex-wrap gap-0.5">
                      {[...new Set(entry.thoughts.flatMap((t) => t.categoryIds))].slice(0, 3).map((catId) => {
                        const cat = categories.find((c) => c.id === catId)
                        if (!cat) return null
                        const colors = DIARY_CATEGORY_COLORS[cat.color] ?? DIARY_CATEGORY_COLORS.slate
                        return (
                          <span
                            key={catId}
                            className={cn("h-1.5 w-3 rounded-full", colors.bg, colors.border, "border")}
                          />
                        )
                      })}
                    </div>
                  )}

                  {/* Бафы/дебафы мини */}
                  <div className="flex gap-0.5">
                    {activeBuffCount > 0 && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        +{activeBuffCount}
                      </span>
                    )}
                    {activeDebuffCount > 0 && (
                      <span className="text-[10px] text-rose-600 dark:text-rose-400">
                        -{activeDebuffCount}
                      </span>
                    )}
                  </div>

                  {/* Часы */}
                  {totalHours > 0 && (
                    <span className="text-[10px] text-muted-foreground">{totalHours}ч</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DiaryPage() {
  const { hydrated } = useDiary()

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
      />

      <TodayBlock />

      <CalendarView />
    </div>
  )
}
