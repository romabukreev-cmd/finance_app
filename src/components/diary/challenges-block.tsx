"use client"

import { useMemo, useState } from "react"
import { Settings, Plus, X, Flame, Trophy } from "lucide-react"
import { useDiary } from "@/components/diary/diary-provider"
import { DEFAULT_DEBUFFS } from "@/lib/diary/constants"
import type { Challenge, DiaryEntry } from "@/lib/diary/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type DayState = "clean" | "broken" | "missing"

type ChallengeStats = {
  streak: number
  last7: DayState[]
  isComplete: boolean
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function computeStats(
  challenge: Challenge,
  entries: DiaryEntry[]
): ChallengeStats {
  const entryByDate = new Map<string, DiaryEntry>()
  for (const e of entries) entryByDate.set(e.date, e)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Streak: walk backwards from today until startDate or until a broken day
  let streak = 0
  const cursor = new Date(today)
  // Guard: if startDate invalid, treat as today
  const startDate = challenge.startDate || toDateStr(today)

  while (true) {
    const dateStr = toDateStr(cursor)
    if (dateStr < startDate) break
    const entry = entryByDate.get(dateStr)
    if (!entry) {
      // no entry — skip (streak doesn't grow, doesn't break)
      cursor.setDate(cursor.getDate() - 1)
      continue
    }
    if (entry.activeDebuffIds.includes(challenge.targetDebuffId)) {
      break
    }
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  // Last 7: today backwards 7 days (index 0 = today)
  const last7: DayState[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = toDateStr(d)
    const entry = entryByDate.get(dateStr)
    if (!entry) {
      last7.push("missing")
    } else if (entry.activeDebuffIds.includes(challenge.targetDebuffId)) {
      last7.push("broken")
    } else {
      last7.push("clean")
    }
  }

  return {
    streak,
    last7,
    isComplete: streak >= challenge.targetDays,
  }
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const { entries, updateChallenge } = useDiary()
  const stats = useMemo(
    () => computeStats(challenge, entries),
    [challenge, entries]
  )

  const progressPct = Math.min(
    100,
    Math.round((stats.streak / challenge.targetDays) * 100)
  )

  const nextTarget =
    challenge.targetDays < 60 ? 60 : challenge.targetDays < 90 ? 90 : null

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 transition-colors hover:border-muted-foreground/30",
        stats.isComplete && "border-amber-500/60 shadow-[0_0_0_1px_rgba(245,158,11,0.3)]"
      )}
    >
      <div className="flex items-start gap-2">
        <span className="text-2xl leading-none">{challenge.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{challenge.title}</div>
          <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <Flame className="size-3.5 text-orange-500" />
            <span>
              {stats.streak} / {challenge.targetDays} дней
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">
          {progressPct}%
        </span>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {stats.last7.map((state, i) => {
          const isToday = i === 0
          return (
            <span
              key={i}
              className={cn(
                "size-3 rounded-full",
                state === "clean" && "bg-emerald-500",
                state === "broken" && "bg-rose-500",
                state === "missing" && "bg-muted/40 border border-muted",
                state === "missing" && isToday && "border-dashed border-muted-foreground/50 bg-transparent"
              )}
              title={
                state === "clean"
                  ? "Чисто"
                  : state === "broken"
                    ? "Сорвался"
                    : "Нет записи"
              }
            />
          )
        })}
      </div>

      {stats.isComplete && (
        <div className="mt-3 flex items-center justify-between gap-2 pt-3 border-t border-amber-500/30">
          <div className="flex items-center gap-1.5 text-sm text-amber-500">
            <Trophy className="size-4" />
            <span>Достигнуто!</span>
          </div>
          {nextTarget && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                updateChallenge({ id: challenge.id, targetDays: nextTarget })
              }
            >
              Продлить до {nextTarget}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function ManageModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { challenges, createChallenge, deleteChallenge } = useDiary()

  const [title, setTitle] = useState("")
  const [emoji, setEmoji] = useState("")
  const [debuffId, setDebuffId] = useState<string>("")
  const [targetDays, setTargetDays] = useState<number>(30)
  const [saving, setSaving] = useState(false)

  const canSubmit = title.trim() && emoji.trim() && debuffId && targetDays > 0

  const handleAdd = async () => {
    if (!canSubmit) return
    setSaving(true)
    try {
      await createChallenge({
        title: title.trim(),
        emoji: emoji.trim(),
        targetDebuffId: debuffId,
        targetDays,
      })
      setTitle("")
      setEmoji("")
      setDebuffId("")
      setTargetDays(30)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Управление челленджами</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {challenges.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              Пока нет челленджей
            </div>
          ) : (
            challenges.map((ch) => {
              const deb = DEFAULT_DEBUFFS.find((d) => d.id === ch.targetDebuffId)
              return (
                <div
                  key={ch.id}
                  className="flex items-center gap-3 rounded-lg border bg-card p-3"
                >
                  <span className="text-xl">{ch.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{ch.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {deb ? `${deb.emoji} ${deb.name}` : "—"} · {ch.targetDays} дней
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteChallenge(ch.id)}
                    aria-label="Удалить"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              )
            })
          )}
        </div>

        <div className="mt-2 space-y-2 pt-4 border-t">
          <div className="text-sm font-medium">Новый челлендж</div>
          <div className="grid grid-cols-[1fr_80px] gap-2">
            <Input
              placeholder="Без кофеина"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="☕"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={4}
              className="text-center"
            />
          </div>
          <Select value={debuffId} onValueChange={(v) => setDebuffId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Целевой дебафф" />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_DEBUFFS.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  <span className="mr-2">{d.emoji}</span>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Цель, дней</label>
            <Input
              type="number"
              min={1}
              value={targetDays}
              onChange={(e) => setTargetDays(Number(e.target.value) || 0)}
              className="w-24"
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!canSubmit || saving}
            className="w-full"
          >
            <Plus className="size-4 mr-1" />
            Добавить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function ChallengesBlock() {
  const { challenges } = useDiary()
  const [manageOpen, setManageOpen] = useState(false)

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold">Челленджи</h2>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Управление челленджами"
          onClick={() => setManageOpen(true)}
        >
          <Settings className="size-4" />
        </Button>
      </div>

      {challenges.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
          <div className="text-sm text-muted-foreground">
            Пока нет активных челленджей
          </div>
          <Button onClick={() => setManageOpen(true)} variant="outline">
            <Plus className="size-4 mr-1" />
            Добавить челлендж
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {challenges.map((ch) => (
            <ChallengeCard key={ch.id} challenge={ch} />
          ))}
        </div>
      )}

      <ManageModal open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  )
}
