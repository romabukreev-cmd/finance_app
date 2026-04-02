import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

/**
 * GET /api/work-hours?date=2026-04-02
 * GET /api/work-hours?from=2026-04-01&to=2026-04-07
 *
 * Returns: { [date]: { [directionId]: totalSeconds } }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get("date")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  let dateFilter: string
  const params: unknown[] = []

  if (date) {
    dateFilter = "task_date = $1"
    params.push(date)
  } else if (from && to) {
    dateFilter = "task_date >= $1 AND task_date <= $2"
    params.push(from, to)
  } else {
    return NextResponse.json({ error: "Provide ?date= or ?from=&to=" }, { status: 400 })
  }

  const { rows } = await query(
    `SELECT task_date, direction_id, SUM(timer_accumulated) as total_seconds
     FROM tasks
     WHERE ${dateFilter} AND direction_id IS NOT NULL AND timer_accumulated > 0
     GROUP BY task_date, direction_id`,
    params
  )

  const result: Record<string, Record<string, number>> = {}
  for (const row of rows) {
    const d = String(row.task_date).slice(0, 10)
    if (!result[d]) result[d] = {}
    result[d][row.direction_id as string] = Number(row.total_seconds)
  }

  return NextResponse.json(result)
}
