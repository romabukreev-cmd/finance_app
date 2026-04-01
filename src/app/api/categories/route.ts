import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  const { rows } = await query(`
    SELECT id, name, kind, color, is_system, is_archived, created_at, updated_at
    FROM categories ORDER BY created_at
  `)
  const categories = rows.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    color: r.color,
    isSystem: r.is_system,
    isArchived: r.is_archived,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, kind, color } = body
  const { rows } = await query(
    `INSERT INTO categories (name, kind, color) VALUES ($1, $2, $3) RETURNING *`,
    [name, kind, color || "gray"]
  )
  const r = rows[0]
  return NextResponse.json({
    id: r.id, name: r.name, kind: r.kind, color: r.color,
    isSystem: r.is_system, isArchived: r.is_archived,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, name, color, isArchived } = body
  const { rows } = await query(
    `UPDATE categories SET name=$1, color=$2, is_archived=$3, updated_at=NOW()
     WHERE id=$4 RETURNING *`,
    [name, color, isArchived ?? false, id]
  )
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const r = rows[0]
  return NextResponse.json({
    id: r.id, name: r.name, kind: r.kind, color: r.color,
    isSystem: r.is_system, isArchived: r.is_archived,
    createdAt: r.created_at, updatedAt: r.updated_at,
  })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await query(`DELETE FROM categories WHERE id=$1`, [id])
  return NextResponse.json({ ok: true })
}
