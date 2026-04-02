import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

function mapTask(r: Record<string, unknown>) {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes ?? null,
    status: r.status,
    priority: r.priority,
    directionId: r.direction_id ?? null,
    taskDate: String(r.task_date).slice(0, 10),
    sortOrder: Number(r.sort_order),
    timerStartedAt: r.timer_started_at ? String(r.timer_started_at) : null,
    timerAccumulated: Number(r.timer_accumulated ?? 0),
    timerIsRunning: Boolean(r.timer_is_running),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    subtasks: [] as Array<{
      id: string
      taskId: string
      title: string
      isDone: boolean
      sortOrder: number
      createdAt: string
    }>,
  }
}

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

export async function GET() {
  const { rows: taskRows } = await query(
    `SELECT * FROM tasks ORDER BY task_date, sort_order, created_at`
  )
  const tasks = taskRows.map(mapTask)

  if (tasks.length > 0) {
    const taskIds = tasks.map((t) => t.id)
    const { rows: subRows } = await query(
      `SELECT * FROM subtasks WHERE task_id = ANY($1) ORDER BY sort_order, created_at`,
      [taskIds]
    )
    const subtasksByTask = new Map<string, typeof tasks[0]["subtasks"]>()
    for (const r of subRows) {
      const sub = mapSubtask(r)
      const list = subtasksByTask.get(sub.taskId) ?? []
      list.push(sub)
      subtasksByTask.set(sub.taskId, list)
    }
    for (const task of tasks) {
      task.subtasks = subtasksByTask.get(task.id as string) ?? []
    }
  }

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    title,
    status = "todo",
    priority = "normal",
    directionId = null,
    taskDate,
    notes = null,
  } = body

  const date = taskDate || new Date().toISOString().slice(0, 10)

  // Get max sort_order for this status+date
  const { rows: maxRows } = await query(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM tasks WHERE status=$1 AND task_date=$2`,
    [status, date]
  )
  const sortOrder = Number(maxRows[0].next_order)

  const { rows } = await query(
    `INSERT INTO tasks (title, notes, status, priority, direction_id, task_date, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [title, notes, status, priority, directionId, date, sortOrder]
  )
  const task = mapTask(rows[0])
  return NextResponse.json(task, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, ...fields } = body

  const sets: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (fields.title !== undefined) { sets.push(`title=$${idx++}`); values.push(fields.title) }
  if (fields.notes !== undefined) { sets.push(`notes=$${idx++}`); values.push(fields.notes) }
  if (fields.status !== undefined) { sets.push(`status=$${idx++}`); values.push(fields.status) }
  if (fields.priority !== undefined) { sets.push(`priority=$${idx++}`); values.push(fields.priority) }
  if (fields.directionId !== undefined) { sets.push(`direction_id=$${idx++}`); values.push(fields.directionId) }
  if (fields.taskDate !== undefined) { sets.push(`task_date=$${idx++}`); values.push(fields.taskDate) }
  if (fields.sortOrder !== undefined) { sets.push(`sort_order=$${idx++}`); values.push(fields.sortOrder) }
  if (fields.timerAccumulated !== undefined) { sets.push(`timer_accumulated=$${idx++}`); values.push(fields.timerAccumulated) }

  if (sets.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  sets.push(`updated_at=NOW()`)
  values.push(id)

  const { rows } = await query(
    `UPDATE tasks SET ${sets.join(", ")} WHERE id=$${idx} RETURNING *`,
    values
  )
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(mapTask(rows[0]))
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await query(`DELETE FROM tasks WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const { items } = await req.json()
  for (const item of items as Array<{ id: string; sortOrder: number; status?: string }>) {
    if (item.status) {
      await query(
        `UPDATE tasks SET sort_order=$1, status=$2, updated_at=NOW() WHERE id=$3`,
        [item.sortOrder, item.status, item.id]
      )
    } else {
      await query(
        `UPDATE tasks SET sort_order=$1, updated_at=NOW() WHERE id=$2`,
        [item.sortOrder, item.id]
      )
    }
  }
  return NextResponse.json({ ok: true })
}
