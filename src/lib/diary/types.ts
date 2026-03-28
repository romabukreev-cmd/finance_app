export type DiaryCategory = {
  id: string
  name: string
  color: string
  createdAt: string
}

export type DiaryThought = {
  id: string
  text: string
  categoryIds: string[]
}

export type BuffDebuff = {
  id: string
  name: string
  emoji: string
  type: "buff" | "debuff"
}

export type WorkLog = {
  directionId: string
  hours: number
}

export type WorkDirection = {
  id: string
  name: string
  color: string
}

export type DiaryEntry = {
  id: string
  date: string
  thoughts: DiaryThought[]
  activeBuffIds: string[]
  activeDebuffIds: string[]
  workLogs: WorkLog[]
  isBookmarked: boolean
  createdAt: string
  updatedAt: string
}

export type DiaryState = {
  categories: DiaryCategory[]
  entries: DiaryEntry[]
  workDirections: WorkDirection[]
}

export type DiaryBackup = {
  version: 1
  exportedAt: string
  state: DiaryState
}
