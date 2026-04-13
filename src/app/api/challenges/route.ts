import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

function mapRow(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    title: r.title as string,
    emoji: r.emoji as string,
    targetDebuffId: r.target_debuff_id as string,
    targetDays: Number(r.target_days),
    startDate: String(r.start_date).slice(0, 10),
    isActive: Boolean(r.is_active),
    sortOrder: Number(r.sort_order),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  }
}

export async function GET() {
  const { rows } = await query(
    `SELECT * FROM diary_challenges ORDER BY sort_order, created_at`
  )
  return NextResponse.json(rows.map(mapRow))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, emoji, targetDebuffId, targetDays = 30, startDate } = body
  if (!title || !emoji || !targetDebuffId) {
    return NextResponse.json({ error: "title, emoji, targetDebuffId required" }, { status: 400 })
  }
  const date = startDate || new Date().toISOString().slice(0, 10)

  const { rows: maxRows } = await query(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM diary_challenges`
  )
  const sortOrder = Number(maxRows[0].next)

  const { rows } = await query(
    `INSERT INTO diary_challenges (title, emoji, target_debuff_id, target_days, start_date, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [title, emoji, targetDebuffId, targetDays, date, sortOrder]
  )
  return NextResponse.json(mapRow(rows[0]), { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, ...fields } = body

  const sets: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (fields.title !== undefined) { sets.push(`title=$${idx++}`); values.push(fields.title) }
  if (fields.emoji !== undefined) { sets.push(`emoji=$${idx++}`); values.push(fields.emoji) }
  if (fields.targetDebuffId !== undefined) { sets.push(`target_debuff_id=$${idx++}`); values.push(fields.targetDebuffId) }
  if (fields.targetDays !== undefined) { sets.push(`target_days=$${idx++}`); values.push(fields.targetDays) }
  if (fields.startDate !== undefined) { sets.push(`start_date=$${idx++}`); values.push(fields.startDate) }
  if (fields.isActive !== undefined) { sets.push(`is_active=$${idx++}`); values.push(fields.isActive) }
  if (fields.sortOrder !== undefined) { sets.push(`sort_order=$${idx++}`); values.push(fields.sortOrder) }

  if (sets.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  values.push(id)
  const { rows } = await query(
    `UPDATE diary_challenges SET ${sets.join(", ")} WHERE id=$${idx} RETURNING *`,
    values
  )
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(mapRow(rows[0]))
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await query(`DELETE FROM diary_challenges WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
