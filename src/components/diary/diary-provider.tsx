"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  DEFAULT_BUFFS,
  DEFAULT_DEBUFFS,
  DEFAULT_DIARY_CATEGORIES,
  DEFAULT_WORK_DIRECTIONS,
} from "@/lib/diary/constants"
import type {
  DiaryCategory,
  DiaryEntry,
  DiaryThought,
  WorkDirection,
} from "@/lib/diary/types"

function emptyEntry(date: string): DiaryEntry {
  return {
    id: "",
    date,
    thoughts: [],
    activeBuffIds: [],
    activeDebuffIds: [],
    workLogs: [],
    isBookmarked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

type DiaryContextValue = {
  hydrated: boolean
  categories: DiaryCategory[]
  entries: DiaryEntry[]
  workDirections: WorkDirection[]
  buffs: typeof DEFAULT_BUFFS
  debuffs: typeof DEFAULT_DEBUFFS
  getOrCreateEntry: (date: string) => DiaryEntry
  addThought: (date: string, text: string, categoryIds: string[]) => void
  updateThought: (date: string, thoughtId: string, text: string, categoryIds: string[]) => void
  deleteThought: (date: string, thoughtId: string) => void
  toggleBuff: (date: string, buffId: string) => void
  toggleDebuff: (date: string, debuffId: string) => void
  toggleBookmark: (date: string) => void
  setWorkLog: (date: string, directionId: string, hours: number) => void
  addCategory: (name: string, color: string) => void
  addWorkDirection: (name: string, color: string) => void
  loadDateRange: (from: string, to: string) => Promise<void>
}

const DiaryContext = createContext<DiaryContextValue | null>(null)

export function useDiary() {
  const ctx = useContext(DiaryContext)
  if (!ctx) throw new Error("useDiary must be used within DiaryProvider")
  return ctx
}

async function postDiary(body: Record<string, unknown>) {
  await fetch("/api/diary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

export function DiaryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [hydrated, setHydrated] = useState(false)

  const categories = useMemo(
    () =>
      DEFAULT_DIARY_CATEGORIES.map((c) => ({
        ...c,
        createdAt: new Date().toISOString(),
      })),
    []
  )

  const loadDateRange = useCallback(
    async (from: string, to: string) => {
      try {
        const res = await fetch(`/api/diary?from=${from}&to=${to}`)
        const data: DiaryEntry[] = await res.json()
        setEntries((prev) => {
          const existingDates = new Set(data.map((e) => e.date))
          const kept = prev.filter((e) => !existingDates.has(e.date))
          return [...kept, ...data]
        })
      } catch (err) {
        console.error("Failed to load diary:", err)
      }
    },
    []
  )

  // Initial load — last 60 days
  useEffect(() => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 60)
    const toStr = to.toISOString().slice(0, 10)
    const fromStr = from.toISOString().slice(0, 10)
    loadDateRange(fromStr, toStr).finally(() => setHydrated(true))
  }, [loadDateRange])

  const refetchDay = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/diary?from=${date}&to=${date}`)
      const data: DiaryEntry[] = await res.json()
      setEntries((prev) => {
        const kept = prev.filter((e) => e.date !== date)
        return [...kept, ...data]
      })
    } catch (err) {
      console.error("Failed to refetch day:", err)
    }
  }, [])

  const getOrCreateEntry = useCallback(
    (date: string): DiaryEntry => {
      return entries.find((e) => e.date === date) ?? emptyEntry(date)
    },
    [entries]
  )

  const addThought = useCallback(
    async (date: string, text: string, categoryIds: string[]) => {
      await postDiary({ action: "addThought", date, text, categoryIds })
      await refetchDay(date)
    },
    [refetchDay]
  )

  const updateThought = useCallback(
    async (date: string, thoughtId: string, text: string, categoryIds: string[]) => {
      await postDiary({ action: "updateThought", thoughtId, text, categoryIds })
      await refetchDay(date)
    },
    [refetchDay]
  )

  const deleteThought = useCallback(
    async (date: string, thoughtId: string) => {
      await postDiary({ action: "deleteThought", thoughtId })
      await refetchDay(date)
    },
    [refetchDay]
  )

  const toggleBuff = useCallback(
    async (date: string, buffId: string) => {
      await postDiary({ action: "toggle", date, toggleId: buffId })
      await refetchDay(date)
    },
    [refetchDay]
  )

  const toggleDebuff = useCallback(
    async (date: string, debuffId: string) => {
      await postDiary({ action: "toggle", date, toggleId: debuffId })
      await refetchDay(date)
    },
    [refetchDay]
  )

  const toggleBookmark = useCallback(
    async (date: string) => {
      await postDiary({ action: "toggleBookmark", date })
      await refetchDay(date)
    },
    [refetchDay]
  )

  // WorkLog — kept as no-op since planner is the source of truth
  const setWorkLog = useCallback(
    (_date: string, _directionId: string, _hours: number) => {},
    []
  )

  const addCategory = useCallback((_name: string, _color: string) => {}, [])
  const addWorkDirection = useCallback((_name: string, _color: string) => {}, [])

  const value = useMemo<DiaryContextValue>(
    () => ({
      hydrated,
      categories,
      entries,
      workDirections: DEFAULT_WORK_DIRECTIONS,
      buffs: DEFAULT_BUFFS,
      debuffs: DEFAULT_DEBUFFS,
      getOrCreateEntry,
      addThought,
      updateThought,
      deleteThought,
      toggleBuff,
      toggleDebuff,
      toggleBookmark,
      setWorkLog,
      addCategory,
      addWorkDirection,
      loadDateRange,
    }),
    [
      hydrated,
      categories,
      entries,
      getOrCreateEntry,
      addThought,
      updateThought,
      deleteThought,
      toggleBuff,
      toggleDebuff,
      toggleBookmark,
      setWorkLog,
      addCategory,
      addWorkDirection,
      loadDateRange,
    ]
  )

  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>
}
