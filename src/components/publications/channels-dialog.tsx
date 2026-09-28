"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { PubChannel } from "@/lib/publications/types"

const WEEKDAYS = [
  { value: 1, label: "Пн" },
  { value: 2, label: "Вт" },
  { value: 3, label: "Ср" },
  { value: 4, label: "Чт" },
  { value: 5, label: "Пт" },
  { value: 6, label: "Сб" },
  { value: 7, label: "Вс" },
]

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ы: "y", э: "e",
  ю: "yu", я: "ya", ь: "", ъ: "",
}

/** Имя канала → id-слаг. Кириллица транслитерируется, остальное режется. */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
  return slug || `channel-${Date.now()}`
}

type Draft = Pick<PubChannel, "name" | "lang" | "url" | "targetDuration" | "planWeekdays">

const EMPTY: Draft = { name: "", lang: "", url: "", targetDuration: "", planWeekdays: [] }

function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[]
  onChange: (next: number[]) => void
}) {
  return (
    <div className="flex gap-1">
      {WEEKDAYS.map((d) => {
        const on = value.includes(d.value)
        return (
          <button
            key={d.value}
            type="button"
            onClick={() =>
              onChange(
                on ? value.filter((v) => v !== d.value) : [...value, d.value].sort((a, b) => a - b)
              )
            }
            className={cn(
              "h-8 w-9 rounded-md border text-xs font-medium transition-colors",
              on
                ? "border-sky-500 bg-sky-500 text-white"
                : "bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            {d.label}
          </button>
        )
      })}
    </div>
  )
}

export function ChannelsDialog({
  open,
  onOpenChange,
  channels,
  onChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  channels: PubChannel[]
  onChanged: () => void
}) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [newChannel, setNewChannel] = useState<Draft>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function draftOf(ch: PubChannel): Draft {
    return (
      drafts[ch.id] ?? {
        name: ch.name,
        lang: ch.lang,
        url: ch.url,
        targetDuration: ch.targetDuration,
        planWeekdays: ch.planWeekdays,
      }
    )
  }

  function edit(ch: PubChannel, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [ch.id]: { ...draftOf(ch), ...patch } }))
  }

  function isDirty(ch: PubChannel) {
    const d = drafts[ch.id]
    if (!d) return false
    return (
      d.name !== ch.name ||
      d.lang !== ch.lang ||
      d.url !== ch.url ||
      d.targetDuration !== ch.targetDuration ||
      d.planWeekdays.join() !== ch.planWeekdays.join()
    )
  }

  async function send(method: "POST" | "PUT" | "DELETE", body: unknown) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/publications/channels", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      onChanged()
      return true
    } catch (e) {
      setError(`Не сохранилось: ${(e as Error).message}`)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function save(ch: PubChannel) {
    const d = draftOf(ch)
    if (!d.name.trim()) {
      setError("Название не может быть пустым")
      return
    }
    if (await send("PUT", { id: ch.id, ...d, name: d.name.trim() })) {
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[ch.id]
        return next
      })
    }
  }

  async function remove(ch: PubChannel) {
    if (!window.confirm(`Удалить канал «${ch.name}» вместе со всеми отметками? Это необратимо.`)) {
      return
    }
    await send("DELETE", { id: ch.id })
  }

  async function create() {
    const name = newChannel.name.trim()
    if (!name) {
      setError("Впиши название канала")
      return
    }
    const id = slugify(name)
    if (channels.some((c) => c.id === id)) {
      setError(`Канал с id «${id}» уже есть — поменяй название`)
      return
    }
    if (await send("POST", { id, ...newChannel, name })) setNewChannel(EMPTY)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Каналы</DialogTitle>
        </DialogHeader>

        {error ? <p className="text-sm text-rose-500">{error}</p> : null}

        <div className="space-y-4">
          {channels.map((ch) => {
            const d = draftOf(ch)
            return (
              <div key={ch.id} className="rounded-xl border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={d.name}
                    onChange={(e) => edit(ch, { name: e.target.value })}
                    placeholder="Название"
                    className="h-9 w-48"
                  />
                  <Input
                    value={d.lang}
                    onChange={(e) => edit(ch, { lang: e.target.value })}
                    placeholder="Язык"
                    className="h-9 w-20"
                  />
                  <Input
                    value={d.targetDuration}
                    onChange={(e) => edit(ch, { targetDuration: e.target.value })}
                    placeholder="Длина"
                    className="h-9 w-24"
                  />
                  <Input
                    value={d.url}
                    onChange={(e) => edit(ch, { url: e.target.value })}
                    placeholder="Ссылка на канал"
                    className="h-9 flex-1 min-w-48"
                  />
                  <button
                    type="button"
                    onClick={() => remove(ch)}
                    disabled={busy}
                    title="Удалить канал"
                    className="flex h-9 w-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-rose-500 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <WeekdayPicker
                    value={d.planWeekdays}
                    onChange={(planWeekdays) => edit(ch, { planWeekdays })}
                  />
                  <span className="text-xs text-muted-foreground">id: {ch.id}</span>
                  {isDirty(ch) ? (
                    <Button size="sm" onClick={() => save(ch)} disabled={busy}>
                      Сохранить
                    </Button>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        <div className="rounded-xl border border-dashed p-3">
          <p className="mb-2 text-sm font-medium">Новый канал</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={newChannel.name}
              onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
              placeholder="Название"
              className="h-9 w-48"
            />
            <Input
              value={newChannel.lang}
              onChange={(e) => setNewChannel({ ...newChannel, lang: e.target.value })}
              placeholder="Язык"
              className="h-9 w-20"
            />
            <Input
              value={newChannel.targetDuration}
              onChange={(e) => setNewChannel({ ...newChannel, targetDuration: e.target.value })}
              placeholder="Длина"
              className="h-9 w-24"
            />
            <Input
              value={newChannel.url}
              onChange={(e) => setNewChannel({ ...newChannel, url: e.target.value })}
              placeholder="Ссылка на канал"
              className="h-9 flex-1 min-w-48"
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <WeekdayPicker
              value={newChannel.planWeekdays}
              onChange={(planWeekdays) => setNewChannel({ ...newChannel, planWeekdays })}
            />
            <Button size="sm" onClick={create} disabled={busy}>
              <Plus className="mr-1 h-4 w-4" />
              Добавить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
