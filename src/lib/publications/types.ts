export type PubChannel = {
  id: string
  name: string
  lang: string
  url: string
  targetDuration: string
  hint: string
  /** ISO-дни недели: 1 = пн … 7 = вс */
  planWeekdays: number[]
  sortOrder: number
  isActive: boolean
}

export type PubCell = {
  channelId: string
  day: string
  /** null — день по недельному плану канала, true/false — ручная правка */
  planned: boolean | null
  done: boolean
  note: string
}

export type PubCalendar = { channels: PubChannel[]; cells: PubCell[] }

/** ISO-день недели (1 = пн … 7 = вс) для строки YYYY-MM-DD */
export function isoWeekday(day: string): number {
  const d = new Date(`${day}T00:00:00Z`).getUTCDay()
  return d === 0 ? 7 : d
}

export function isPlanned(channel: PubChannel, day: string, cell?: PubCell): boolean {
  if (cell && cell.planned !== null) return cell.planned
  return channel.planWeekdays.includes(isoWeekday(day))
}
