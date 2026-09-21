import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { mapChannel } from "@/lib/publications/map"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function mapCell(r: Record<string, unknown>) {
  return {
    channelId: r.channel_id as string,
    day: String(r.day).slice(0, 10),
    planned: r.planned === null ? null : Boolean(r.planned),
    done: Boolean(r.done),
    note: (r.note as string) ?? "",
  }
}

/**
 * GET /api/publications?from=2026-09-14&to=2026-10-04
 * Returns: { channels, cells } — клетки только те, что правились вручную;
 * остальные дни синие/серые по planWeekdays канала.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  if (!from || !to || !DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: "Provide ?from=YYYY-MM-DD&to=YYYY-MM-DD" }, { status: 400 })
  }
  const [channels, cells] = await Promise.all([
    query(`SELECT * FROM pub_channels WHERE is_active ORDER BY sort_order, name`),
    query(`SELECT * FROM pub_cells WHERE day >= $1 AND day <= $2`, [from, to]),
  ])
  return NextResponse.json({
    channels: channels.rows.map(mapChannel),
    cells: cells.rows.map(mapCell),
  })
}

/**
 * PATCH /api/publications
 * Body: { channelId, day, planned?: boolean | null, done?: boolean, note?: string }
 * Upsert одной клетки. planned: null — вернуть день к недельному плану.
 */
export async function PATCH(req: NextRequest) {
  const { channelId, day, planned, done, note } = await req.json()
  if (!channelId || !day || !DATE_RE.test(day)) {
    return NextResponse.json({ error: "channelId and day (YYYY-MM-DD) required" }, { status: 400 })
  }
  const { rows } = await query(
    `INSERT INTO pub_cells (channel_id, day, planned, done, note)
     VALUES ($1, $2, $3, COALESCE($4, false), COALESCE($5, ''))
     ON CONFLICT (channel_id, day) DO UPDATE SET
       planned = CASE WHEN $6 THEN EXCLUDED.planned ELSE pub_cells.planned END,
       done = COALESCE($4, pub_cells.done),
       note = COALESCE($5, pub_cells.note),
       updated_at = now()
     RETURNING *`,
    [channelId, day, planned ?? null, done ?? null, note ?? null, planned !== undefined]
  )
  return NextResponse.json(mapCell(rows[0]))
}
