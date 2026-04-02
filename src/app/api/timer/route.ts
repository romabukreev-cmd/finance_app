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
    subtasks: [],
  }
}

export async function POST(req: NextRequest) {
  const { action, taskId } = await req.json()

  if (action === "start") {
    // Stop any currently running timer first
    await query(
      `UPDATE tasks SET
        timer_accumulated = timer_accumulated + EXTRACT(EPOCH FROM (NOW() - timer_started_at))::integer,
        timer_started_at = NULL,
        timer_is_running = false,
        updated_at = NOW()
       WHERE timer_is_running = true AND id != $1`,
      [taskId]
    )

    const { rows } = await query(
      `UPDATE tasks SET
        timer_started_at = NOW(),
        timer_is_running = true,
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [taskId]
    )
    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(mapTask(rows[0]))
  }

  if (action === "pause") {
    const { rows } = await query(
      `UPDATE tasks SET
        timer_accumulated = timer_accumulated + COALESCE(EXTRACT(EPOCH FROM (NOW() - timer_started_at))::integer, 0),
        timer_started_at = NULL,
        timer_is_running = false,
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [taskId]
    )
    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(mapTask(rows[0]))
  }

  if (action === "stop") {
    const { rows } = await query(
      `UPDATE tasks SET
        timer_accumulated = timer_accumulated + COALESCE(EXTRACT(EPOCH FROM (NOW() - timer_started_at))::integer, 0),
        timer_started_at = NULL,
        timer_is_running = false,
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [taskId]
    )
    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(mapTask(rows[0]))
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
