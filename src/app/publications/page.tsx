"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  isPlanned,
  isoWeekday,
  type PubCalendar,
  type PubCell,
  type PubChannel,
} from "@/lib/publications/types"

const WEEKS = 3
const WEEKDAY_SHORT = ["", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
const MONTH_SHORT = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]

type Mode = "done" | "plan" | "note"

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "done", label: "Отметить", hint: "Клик — опубликовано / нет" },
  { value: "plan", label: "План", hint: "Клик — добавить день в план / убрать" },
  { value: "note", label: "Заметка", hint: "Клик — подпись внутри кубика" },
]

function toKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

function mondayOf(d: Date) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const wd = r.getDay() === 0 ? 7 : r.getDay()
  r.setDate(r.getDate() - (wd - 1))
  return r
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

// окно: прошлая неделя, текущая, следующая
const defaultStart = () => addDays(mondayOf(new Date()), -7)

export default function PublicationsPage() {
  const todayKey = toKey(new Date())
  const [start, setStart] = useState(defaultStart)
  const [data, setData] = useState<PubCalendar | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>("done")

  const days = useMemo(
    () => Array.from({ length: WEEKS * 7 }, (_, i) => toKey(addDays(start, i))),
    [start]
  )

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/publications?from=${days[0]}&to=${days[days.length - 1]}`)
      if (!res.ok) throw new Error(`${res.status}`)
      setData(await res.json())
      setError(null)
    } catch (e) {
      setError(`Не удалось загрузить календарь (${(e as Error).message})`)
    }
  }, [days])

  useEffect(() => {
    load()
  }, [load])

  const cellMap = useMemo(() => {
    const m = new Map<string, PubCell>()
    for (const c of data?.cells ?? []) m.set(`${c.channelId}|${c.day}`, c)
    return m
  }, [data])

  async function patch(channel: PubChannel, day: string, change: Partial<PubCell>) {
    const prev = cellMap.get(`${channel.id}|${day}`)
    const next: PubCell = {
      channelId: channel.id,
      day,
      planned: prev?.planned ?? null,
      done: prev?.done ?? false,
      note: prev?.note ?? "",
      ...change,
    }
    // оптимистично
    setData((d) =>
      d && {
        ...d,
        cells: [...d.cells.filter((c) => !(c.channelId === channel.id && c.day === day)), next],
      }
    )
    const res = await fetch("/api/publications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: channel.id, day, ...change }),
    })
    if (!res.ok) {
      setError("Не сохранилось — обнови страницу")
      load()
    }
  }

  function onCellClick(channel: PubChannel, day: string) {
    const cell = cellMap.get(`${channel.id}|${day}`)
    if (mode === "done") {
      patch(channel, day, { done: !(cell?.done ?? false) })
    } else if (mode === "plan") {
      const nextPlanned = !isPlanned(channel, day, cell)
      const byWeekday = channel.planWeekdays.includes(isoWeekday(day))
      // совпало с недельным планом — снимаем ручную правку
      patch(channel, day, { planned: nextPlanned === byWeekday ? null : nextPlanned })
    } else {
      const note = window.prompt(
        `${channel.name}, ${day}\nПодпись в кубике (пусто — показывать «${channel.targetDuration}»):`,
        cell?.note ?? ""
      )
      if (note !== null) patch(channel, day, { note: note.trim() })
    }
  }

  const rangeLabel = (() => {
    const a = new Date(`${days[0]}T00:00:00`)
    const b = new Date(`${days[days.length - 1]}T00:00:00`)
    return `${a.getDate()} ${MONTH_SHORT[a.getMonth()]} — ${b.getDate()} ${MONTH_SHORT[b.getMonth()]}`
  })()

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Публикации"
        description={rangeLabel}
        actions={
          <>
            <Button variant="outline" size="icon" onClick={() => setStart((s) => addDays(s, -7))} title="Неделя назад">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setStart(defaultStart())}>
              Сегодня
            </Button>
            <Button variant="outline" size="icon" onClick={() => setStart((s) => addDays(s, 7))} title="Неделя вперёд">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border bg-background p-1">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMode(m.value)}
              title={m.hint}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === m.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{MODES.find((m) => m.value === mode)?.hint}</p>
      </div>

      {error ? <p className="mb-4 text-sm text-rose-500">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border bg-card p-3">
        <table className="border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card" />
              {days.map((day, i) => {
                const d = new Date(`${day}T00:00:00`)
                const wd = isoWeekday(day)
                return (
                  <th
                    key={day}
                    className={cn(
                      "min-w-10 px-0 pb-1 text-center text-xs font-medium",
                      wd >= 6 ? "text-rose-500/80" : "text-muted-foreground",
                      i > 0 && wd === 1 && "border-l-2 border-border pl-1",
                      day === todayKey && "text-foreground"
                    )}
                  >
                    <div>{WEEKDAY_SHORT[wd]}</div>
                    <div
                      className={cn(
                        "mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm",
                        day === todayKey && "bg-primary text-primary-foreground"
                      )}
                    >
                      {d.getDate()}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {(data?.channels ?? []).map((ch) => (
              <tr key={ch.id}>
                <th className="group sticky left-0 z-10 bg-card pr-3 text-left font-normal">
                  <a
                    href={ch.url || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 whitespace-nowrap text-sm font-medium hover:underline"
                  >
                    {ch.name}
                    {ch.lang ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {ch.lang}
                      </span>
                    ) : null}
                  </a>
                  <div className="pointer-events-none absolute left-full top-1/2 z-30 ml-1 hidden -translate-y-1/2 w-72 rounded-lg border bg-popover p-3 text-xs leading-relaxed text-popover-foreground shadow-lg group-hover:block">
                    <p className="mb-1 font-semibold">Длина: {ch.targetDuration || "—"}</p>
                    <p className="mb-1">
                      План: {ch.planWeekdays.length ? ch.planWeekdays.map((w) => WEEKDAY_SHORT[w]).join(", ") : "—"}
                    </p>
                    {ch.hint}
                  </div>
                </th>
                {days.map((day, i) => {
                  const cell = cellMap.get(`${ch.id}|${day}`)
                  const planned = isPlanned(ch, day, cell)
                  const done = cell?.done ?? false
                  const missed = planned && !done && day < todayKey
                  const label = cell?.note || (planned || done ? ch.targetDuration : "")
                  return (
                    <td key={day} className={cn("p-0", i > 0 && isoWeekday(day) === 1 && "border-l-2 border-border pl-1")}>
                      <button
                        onClick={() => onCellClick(ch, day)}
                        title={`${ch.name} · ${day}${cell?.note ? ` · ${cell.note}` : ""}`}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center overflow-hidden rounded-md text-[10px] font-semibold leading-none transition-transform hover:scale-110",
                          done
                            ? "bg-emerald-500 text-white"
                            : planned
                              ? cn("bg-sky-500 text-white", missed && "opacity-40")
                              : "bg-muted text-muted-foreground",
                          day === todayKey && "ring-2 ring-primary ring-offset-1 ring-offset-card"
                        )}
                      >
                        {label}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.channels.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Каналов пока нет.</p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-muted" /> пусто</span>
        <span className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-sky-500" /> по плану</span>
        <span className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-sky-500 opacity-40" /> план пропущен</span>
        <span className="flex items-center gap-2"><span className="h-4 w-4 rounded bg-emerald-500" /> опубликовано</span>
      </div>
    </div>
  )
}
