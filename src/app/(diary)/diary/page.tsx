"use client"

import { Component, useMemo, useState, type ReactNode } from "react"
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
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
  small,
}: {
  name: string
  color: string
  onClick?: () => void
  selected?: boolean
  small?: boolean
}) {
  const colors = DIARY_CATEGORY_COLORS[color] ?? DIARY_CATEGORY_COLORS.slate
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border font-medium transition-all",
        small ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
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

function BuffDebuffGrid({
  items,
  activeIds,
  type,
  onToggle,
}: {
  items: Array<{ id: string; name: string; emoji: string }>
  activeIds: string[]
  type: "buff" | "debuff"
  onToggle: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isActive = activeIds.includes(item.id)
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all",
              isActive
                ? type === "buff"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"
                  : "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-200"
                : "border-border bg-muted/30 text-muted-foreground opacity-50 hover:opacity-80"
            )}
          >
            <span className="text-lg">{item.emoji}</span>
            {item.name}
          </button>
        )
      })}
    </div>
  )
}

function WorkHoursBlock({
  directions,
  workLogs,
  onSet,
}: {
  directions: Array<{ id: string; name: string; color: string }>
  workLogs: Array<{ directionId: string; hours: number }>
  onSet: (directionId: string, hours: number) => void
}) {
  const totalHours = workLogs.reduce((sum, w) => sum + w.hours, 0)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">Рабочие часы</h3>
        <span className="flex items-center gap-1 text-sm font-bold">
          <Clock className="h-4 w-4" />
          {totalHours}ч
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {directions.map((dir) => {
          const log = workLogs.find((w) => w.directionId === dir.id)
          const hours = log?.hours ?? 0
          const colors = DIARY_CATEGORY_COLORS[dir.color] ?? DIARY_CATEGORY_COLORS.slate
          return (
            <div
              key={dir.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3",
                hours > 0 ? `${colors.bg} ${colors.border}` : "border-border"
              )}
            >
              <span className={cn("text-sm font-medium", hours > 0 ? colors.text : "text-muted-foreground")}>
                {dir.name}
              </span>
              <Input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={hours || ""}
                placeholder="0"
                className="ml-auto h-8 w-20 text-center text-sm"
                onChange={(e) => onSet(dir.id, Number(e.target.value) || 0)}
              />
              <span className="text-xs text-muted-foreground">ч</span>
            </div>
          )
        })}
      </div>
    </div>
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
      <CardContent className="space-y-6">
        {/* Мысли */}
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
                          small
                        />
                      )
                    })}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{thought.text}</p>
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
                  small
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Запиши мысль или идею..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleAddThought()
                  }
                }}
                className="flex-1"
              />
              <Button size="icon" onClick={handleAddThought} disabled={!newText.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Бафы */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Бафы</h3>
          <BuffDebuffGrid
            items={buffs}
            activeIds={entry.activeBuffIds}
            type="buff"
            onToggle={(id) => toggleBuff(today, id)}
          />
        </div>

        {/* Дебафы */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400">Дебафы</h3>
          <BuffDebuffGrid
            items={debuffs}
            activeIds={entry.activeDebuffIds}
            type="debuff"
            onToggle={(id) => toggleDebuff(today, id)}
          />
        </div>

        {/* Рабочие часы */}
        <WorkHoursBlock
          directions={workDirections}
          workLogs={entry.workLogs}
          onSet={(dirId, hours) => setWorkLog(today, dirId, hours)}
        />
      </CardContent>
    </Card>
  )
}

function DayCard({ date }: { date: string }) {
  const {
    categories,
    workDirections,
    buffs,
    debuffs,
    getOrCreateEntry,
  } = useDiary()

  const entry = getOrCreateEntry(date)
  const [expanded, setExpanded] = useState(false)

  const totalHours = entry.workLogs.reduce((sum, w) => sum + w.hours, 0)
  const activeBuffs = buffs.filter((b) => entry.activeBuffIds.includes(b.id))
  const activeDebuffs = debuffs.filter((d) => entry.activeDebuffIds.includes(d.id))

  return (
    <Card
      className={cn(
        "transition-all",
        entry.isBookmarked && "border-amber-300 dark:border-amber-700"
      )}
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{formatDateRu(date)}</span>
            {entry.isBookmarked && (
              <Flame className="h-4 w-4 fill-amber-500 text-amber-500" />
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {totalHours > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {totalHours}ч
              </span>
            )}
            {activeBuffs.length > 0 && (
              <span>{activeBuffs.map((b) => b.emoji).join("")}</span>
            )}
            {activeDebuffs.length > 0 && (
              <span>{activeDebuffs.map((d) => d.emoji).join("")}</span>
            )}
            <span>{entry.thoughts.length} {entry.thoughts.length === 1 ? "мысль" : "мыслей"}</span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <CardContent className="space-y-4 border-t pt-4">
          {entry.thoughts.length > 0 && (
            <div className="space-y-2">
              {entry.thoughts.map((thought) => (
                <div key={thought.id} className="space-y-1 rounded-lg bg-muted/40 p-2.5">
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
                            small
                          />
                        )
                      })}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{thought.text}</p>
                </div>
              ))}
            </div>
          )}

          {entry.workLogs.length > 0 && (
            <div className="flex flex-wrap gap-2 text-sm">
              {entry.workLogs.map((log) => {
                const dir = workDirections.find((d) => d.id === log.directionId)
                return (
                  <span
                    key={log.directionId}
                    className="rounded-lg bg-muted px-2 py-1 text-xs font-medium"
                  >
                    {dir?.name ?? "?"}: {log.hours}ч
                  </span>
                )
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

class DiaryErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-3xl space-y-4 p-8">
          <h1 className="text-2xl font-bold text-rose-600">Ошибка в дневнике</h1>
          <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
            {this.state.error.message}
          </pre>
          <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs text-muted-foreground">
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

export default function DiaryPage() {
  const { hydrated, entries } = useDiary()

  const pastDates = useMemo(() => {
    const today = todayIsoDate()
    return entries
      .filter((e) => e.date !== today)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((e) => e.date)
  }, [entries])

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl py-20 text-center text-muted-foreground">
        Загрузка...
      </div>
    )
  }

  return (
    <DiaryErrorBoundary>
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="Дневник"
          description="Мысли, привычки и рабочие часы — каждый день."
        />

        <TodayBlock />

        {pastDates.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-muted-foreground">История</h2>
            {pastDates.map((date) => (
              <DayCard key={date} date={date} />
            ))}
          </div>
        )}
      </div>
    </DiaryErrorBoundary>
  )
}
