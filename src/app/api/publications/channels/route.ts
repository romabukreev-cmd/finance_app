import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { mapChannel } from "@/lib/publications/map"

export async function GET() {
  const { rows } = await query(`SELECT * FROM pub_channels ORDER BY sort_order, name`)
  return NextResponse.json(rows.map(mapChannel))
}

/** POST — новый канал. Body: { id, name, lang?, url?, targetDuration?, hint?, planWeekdays? } */
export async function POST(req: NextRequest) {
  const b = await req.json()
  if (!b.id || !b.name) {
    return NextResponse.json({ error: "id and name required" }, { status: 400 })
  }
  const { rows } = await query(
    `INSERT INTO pub_channels (id, name, lang, url, target_duration, hint, plan_weekdays, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7,
       (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM pub_channels))
     RETURNING *`,
    [b.id, b.name, b.lang ?? "", b.url ?? "", b.targetDuration ?? "", b.hint ?? "", b.planWeekdays ?? []]
  )
  return NextResponse.json(mapChannel(rows[0]), { status: 201 })
}

/** PUT — правка канала. Body: { id, ...поля } */
export async function PUT(req: NextRequest) {
  const { id, ...f } = await req.json()
  const cols: Record<string, string> = {
    name: "name", lang: "lang", url: "url", targetDuration: "target_duration",
    hint: "hint", planWeekdays: "plan_weekdays", sortOrder: "sort_order", isActive: "is_active",
  }
  const sets: string[] = []
  const values: unknown[] = []
  for (const [key, col] of Object.entries(cols)) {
    if (f[key] !== undefined) { values.push(f[key]); sets.push(`${col}=$${values.length}`) }
  }
  if (!id || sets.length === 0) {
    return NextResponse.json({ error: "id and at least one field required" }, { status: 400 })
  }
  values.push(id)
  const { rows } = await query(
    `UPDATE pub_channels SET ${sets.join(", ")} WHERE id=$${values.length} RETURNING *`,
    values
  )
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(mapChannel(rows[0]))
}
