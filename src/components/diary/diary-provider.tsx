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
  DiaryState,
  DiaryThought,
  WorkDirection,
  WorkLog,
} from "@/lib/diary/types"
import { todayIsoDate } from "@/lib/finance/format"

const STORAGE_KEY = "diary:state:v1"

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function emptyEntry(date: string): DiaryEntry {
  return {
    id: generateId(),
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

function defaultState(): DiaryState {
  return {
    categories: DEFAULT_DIARY_CATEGORIES.map((c) => ({
      ...c,
      createdAt: new Date().toISOString(),
    })),
    entries: [],
    workDirections: DEFAULT_WORK_DIRECTIONS,
  }
}

function loadState(): DiaryState {
  if (typeof window === "undefined") return defaultState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    return JSON.parse(raw) as DiaryState
  } catch {
    return defaultState()
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
}

const DiaryContext = createContext<DiaryContextValue | null>(null)

export function useDiary() {
  const ctx = useContext(DiaryContext)
  if (!ctx) throw new Error("useDiary must be used within DiaryProvider")
  return ctx
}

export function DiaryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DiaryState>(defaultState)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setState(loadState())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [hydrated, state])

  const updateEntry = useCallback(
    (date: string, updater: (entry: DiaryEntry) => DiaryEntry) => {
      setState((prev) => {
        const existing = prev.entries.find((e) => e.date === date)
        const entry = existing ?? emptyEntry(date)
        const updated = { ...updater(entry), updatedAt: new Date().toISOString() }
        const entries = existing
          ? prev.entries.map((e) => (e.date === date ? updated : e))
          : [...prev.entries, updated]
        return { ...prev, entries }
      })
    },
    []
  )

  const getOrCreateEntry = useCallback(
    (date: string): DiaryEntry => {
      return state.entries.find((e) => e.date === date) ?? emptyEntry(date)
    },
    [state.entries]
  )

  const addThought = useCallback(
    (date: string, text: string, categoryIds: string[]) => {
      const thought: DiaryThought = { id: generateId(), text, categoryIds }
      updateEntry(date, (entry) => ({
        ...entry,
        thoughts: [...entry.thoughts, thought],
      }))
    },
    [updateEntry]
  )

  const updateThought = useCallback(
    (date: string, thoughtId: string, text: string, categoryIds: string[]) => {
      updateEntry(date, (entry) => ({
        ...entry,
        thoughts: entry.thoughts.map((t) =>
          t.id === thoughtId ? { ...t, text, categoryIds } : t
        ),
      }))
    },
    [updateEntry]
  )

  const deleteThought = useCallback(
    (date: string, thoughtId: string) => {
      updateEntry(date, (entry) => ({
        ...entry,
        thoughts: entry.thoughts.filter((t) => t.id !== thoughtId),
      }))
    },
    [updateEntry]
  )

  const toggleBuff = useCallback(
    (date: string, buffId: string) => {
      updateEntry(date, (entry) => ({
        ...entry,
        activeBuffIds: entry.activeBuffIds.includes(buffId)
          ? entry.activeBuffIds.filter((id) => id !== buffId)
          : [...entry.activeBuffIds, buffId],
      }))
    },
    [updateEntry]
  )

  const toggleDebuff = useCallback(
    (date: string, debuffId: string) => {
      updateEntry(date, (entry) => ({
        ...entry,
        activeDebuffIds: entry.activeDebuffIds.includes(debuffId)
          ? entry.activeDebuffIds.filter((id) => id !== debuffId)
          : [...entry.activeDebuffIds, debuffId],
      }))
    },
    [updateEntry]
  )

  const toggleBookmark = useCallback(
    (date: string) => {
      updateEntry(date, (entry) => ({
        ...entry,
        isBookmarked: !entry.isBookmarked,
      }))
    },
    [updateEntry]
  )

  const setWorkLog = useCallback(
    (date: string, directionId: string, hours: number) => {
      updateEntry(date, (entry) => {
        const existing = entry.workLogs.find((w) => w.directionId === directionId)
        const workLogs: WorkLog[] = existing
          ? hours > 0
            ? entry.workLogs.map((w) =>
                w.directionId === directionId ? { ...w, hours } : w
              )
            : entry.workLogs.filter((w) => w.directionId !== directionId)
          : hours > 0
            ? [...entry.workLogs, { directionId, hours }]
            : entry.workLogs
        return { ...entry, workLogs }
      })
    },
    [updateEntry]
  )

  const addCategory = useCallback((name: string, color: string) => {
    setState((prev) => ({
      ...prev,
      categories: [
        ...prev.categories,
        { id: generateId(), name, color, createdAt: new Date().toISOString() },
      ],
    }))
  }, [])

  const addWorkDirection = useCallback((name: string, color: string) => {
    setState((prev) => ({
      ...prev,
      workDirections: [
        ...prev.workDirections,
        { id: generateId(), name, color },
      ],
    }))
  }, [])

  const value = useMemo<DiaryContextValue>(
    () => ({
      hydrated,
      categories: state.categories,
      entries: state.entries,
      workDirections: state.workDirections,
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
    }),
    [
      hydrated,
      state.categories,
      state.entries,
      state.workDirections,
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
    ]
  )

  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>
}
