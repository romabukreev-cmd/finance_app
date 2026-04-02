import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

function mapSubtask(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    taskId: r.task_id as string,
    title: r.title as string,
    isDone: Boolean(r.is_done),
    sortOrder: Number(r.sort_order),
    createdAt: String(r.created_at),
  }
}

export async function POST(req: NextRequest) {
  const { taskId, title } = await req.json()
  const { rows: maxRows } = await query(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM subtasks WHERE task_id=$1`,
    [taskId]
  )
  const sortOrder = Number(maxRows[0].next_order)

  const { rows } = await query(
    `INSERT INTO subtasks (task_id, title, sort_order) VALUES ($1, $2, $3) RETURNING *`,
    [taskId, title, sortOrder]
  )
  return NextResponse.json(mapSubtask(rows[0]), { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, ...fields } = body

  const sets: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (fields.title !== undefined) { sets.push(`title=$${idx++}`); values.push(fields.title) }
  if (fields.isDone !== undefined) { sets.push(`is_done=$${idx++}`); values.push(fields.isDone) }
  if (fields.sortOrder !== undefined) { sets.push(`sort_order=$${idx++}`); values.push(fields.sortOrder) }

  if (sets.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  values.push(id)
  const { rows } = await query(
    `UPDATE subtasks SET ${sets.join(", ")} WHERE id=$${idx} RETURNING *`,
    values
  )
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(mapSubtask(rows[0]))
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await query(`DELETE FROM subtasks WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
