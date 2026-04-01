import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  const { rows } = await query(`
    SELECT id, name, type, color, start_balance, start_date, is_archived, created_at, updated_at
    FROM accounts ORDER BY created_at
  `)
  const accounts = rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    color: r.color,
    startBalance: Number(r.start_balance),
    startDate: String(r.start_date).slice(0, 10),
    isArchived: r.is_archived,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
  return NextResponse.json(accounts)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, type, color, startBalance, startDate } = body
  const { rows } = await query(
    `INSERT INTO accounts (name, type, color, start_balance, start_date)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, type, color || "slate", startBalance || 0, startDate || new Date().toISOString().slice(0, 10)]
  )
  const r = rows[0]
  return NextResponse.json({
    id: r.id, name: r.name, type: r.type, color: r.color,
    startBalance: Number(r.start_balance),
    startDate: String(r.start_date).slice(0, 10),
    isArchived: r.is_archived, createdAt: r.created_at, updatedAt: r.updated_at,
  }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, name, type, color, startBalance, startDate, isArchived } = body
  const { rows } = await query(
    `UPDATE accounts SET name=$1, type=$2, color=$3, start_balance=$4, start_date=$5, is_archived=$6, updated_at=NOW()
     WHERE id=$7 RETURNING *`,
    [name, type, color, startBalance, startDate, isArchived ?? false, id]
  )
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const r = rows[0]
  return NextResponse.json({
    id: r.id, name: r.name, type: r.type, color: r.color,
    startBalance: Number(r.start_balance),
    startDate: String(r.start_date).slice(0, 10),
    isArchived: r.is_archived, createdAt: r.created_at, updatedAt: r.updated_at,
  })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await query(`DELETE FROM accounts WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
