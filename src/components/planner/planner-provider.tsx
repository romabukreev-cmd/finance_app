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
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  CreateSubtaskInput,
  UpdateSubtaskInput,
} from "@/lib/planner/types"
import { plannerApi } from "@/lib/planner/api"

type PlannerContextValue = {
  tasks: Task[]
  hydrated: boolean
  createTask: (input: CreateTaskInput) => Promise<void>
  updateTask: (input: UpdateTaskInput) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  reorderTasks: (items: Array<{ id: string; sortOrder: number; status?: string }>) => Promise<void>
  createSubtask: (input: CreateSubtaskInput) => Promise<void>
  updateSubtask: (input: UpdateSubtaskInput) => Promise<void>
  deleteSubtask: (id: string) => Promise<void>
  startTimer: (taskId: string) => Promise<void>
  pauseTimer: (taskId: string) => Promise<void>
  stopTimer: (taskId: string) => Promise<void>
  refetch: () => Promise<void>
}

const PlannerContext = createContext<PlannerContextValue | null>(null)

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [hydrated, setHydrated] = useState(false)

  const refetch = useCallback(async () => {
    try {
      const data = await plannerApi.tasks.list()
      setTasks(data)
    } catch (err) {
      console.error("Failed to fetch tasks:", err)
    }
  }, [])

  useEffect(() => {
    refetch().then(() => {
      setHydrated(true)
    })
  }, [refetch])

  const createTask = useCallback(async (input: CreateTaskInput) => {
    await plannerApi.tasks.create(input)
    await refetch()
  }, [refetch])

  const updateTask = useCallback(async (input: UpdateTaskInput) => {
    await plannerApi.tasks.update(input)
    await refetch()
  }, [refetch])

  const deleteTask = useCallback(async (id: string) => {
    await plannerApi.tasks.delete(id)
    await refetch()
  }, [refetch])

  const reorderTasks = useCallback(async (items: Array<{ id: string; sortOrder: number; status?: string }>) => {
    await plannerApi.tasks.reorder(items)
    await refetch()
  }, [refetch])

  const createSubtask = useCallback(async (input: CreateSubtaskInput) => {
    await plannerApi.subtasks.create(input)
    await refetch()
  }, [refetch])

  const updateSubtask = useCallback(async (input: UpdateSubtaskInput) => {
    await plannerApi.subtasks.update(input)
    await refetch()
  }, [refetch])

  const deleteSubtask = useCallback(async (id: string) => {
    await plannerApi.subtasks.delete(id)
    await refetch()
  }, [refetch])

  const startTimer = useCallback(async (taskId: string) => {
    await plannerApi.timer.start(taskId)
    await refetch()
  }, [refetch])

  const pauseTimer = useCallback(async (taskId: string) => {
    await plannerApi.timer.pause(taskId)
    await refetch()
  }, [refetch])

  const stopTimer = useCallback(async (taskId: string) => {
    await plannerApi.timer.stop(taskId)
    await refetch()
  }, [refetch])

  const value = useMemo<PlannerContextValue>(
    () => ({
      tasks,
      hydrated,
      createTask,
      updateTask,
      deleteTask,
      reorderTasks,
      createSubtask,
      updateSubtask,
      deleteSubtask,
      startTimer,
      pauseTimer,
      stopTimer,
      refetch,
    }),
    [
      tasks,
      hydrated,
      createTask,
      updateTask,
      deleteTask,
      reorderTasks,
      createSubtask,
      updateSubtask,
      deleteSubtask,
      startTimer,
      pauseTimer,
      stopTimer,
      refetch,
    ]
  )

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
}

export function usePlanner() {
  const context = useContext(PlannerContext)

  if (!context) {
    throw new Error("usePlanner must be used inside PlannerProvider")
  }

  return context
}
