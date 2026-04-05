import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

// ---------------------------------------------------------------------------
// GET /api/diary?from=2026-04-01&to=2026-04-07
// Returns array of diary entries with thoughts and toggles
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  if (!from || !to) {
    return NextResponse.json({ error: "Provide ?from=&to=" }, { status: 400 })
  }

  // Entries
  const { rows: entryRows } = await query(
    `SELECT * FROM diary_entries WHERE entry_date >= $1 AND entry_date <= $2 ORDER BY entry_date DESC`,
    [from, to]
  )

  // Thoughts
  const { rows: thoughtRows } = await query(
    `SELECT * FROM diary_thoughts WHERE entry_date >= $1 AND entry_date <= $2 ORDER BY entry_date, sort_order, created_at`,
    [from, to]
  )

  // Toggles (buffs/debuffs)
  const { rows: toggleRows } = await query(
    `SELECT * FROM diary_toggles WHERE entry_date >= $1 AND entry_date <= $2`,
    [from, to]
  )

  // Group by date
  const thoughtsByDate = new Map<string, Array<{ id: string; text: string; categoryIds: string[]; sortOrder: number }>>()
  for (const r of thoughtRows) {
    const d = String(r.entry_date).slice(0, 10)
    const list = thoughtsByDate.get(d) ?? []
    list.push({
      id: r.id as string,
      text: r.text as string,
      categoryIds: (r.category_ids as string[]) ?? [],
      sortOrder: Number(r.sort_order),
    })
    thoughtsByDate.set(d, list)
  }

  const togglesByDate = new Map<string, string[]>()
  for (const r of toggleRows) {
    const d = String(r.entry_date).slice(0, 10)
    const list = togglesByDate.get(d) ?? []
    list.push(r.toggle_id as string)
    togglesByDate.set(d, list)
  }

  const entries = entryRows.map((r) => {
    const d = String(r.entry_date).slice(0, 10)
    const toggleIds = togglesByDate.get(d) ?? []
    return {
      id: r.id as string,
      date: d,
      thoughts: thoughtsByDate.get(d) ?? [],
      activeBuffIds: toggleIds.filter((id) => id.startsWith("buff-")),
      activeDebuffIds: toggleIds.filter((id) => id.startsWith("debuff-")),
      isBookmarked: Boolean(r.is_bookmarked),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }
  })

  return NextResponse.json(entries)
}

// ---------------------------------------------------------------------------
// POST /api/diary — multiple actions
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action } = body

  // Ensure entry exists for a date
  async function ensureEntry(date: string) {
    await query(
      `INSERT INTO diary_entries (entry_date) VALUES ($1) ON CONFLICT (entry_date) DO NOTHING`,
      [date]
    )
  }

  // --- ADD THOUGHT ---
  if (action === "addThought") {
    const { date, text, categoryIds } = body
    await ensureEntry(date)
    const { rows: maxRows } = await query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 as next FROM diary_thoughts WHERE entry_date=$1`,
      [date]
    )
    const { rows } = await query(
      `INSERT INTO diary_thoughts (entry_date, text, category_ids, sort_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [date, text, categoryIds ?? [], Number(maxRows[0].next)]
    )
    return NextResponse.json({ id: rows[0].id }, { status: 201 })
  }

  // --- UPDATE THOUGHT ---
  if (action === "updateThought") {
    const { thoughtId, text, categoryIds } = body
    await query(
      `UPDATE diary_thoughts SET text=$1, category_ids=$2 WHERE id=$3`,
      [text, categoryIds ?? [], thoughtId]
    )
    return NextResponse.json({ ok: true })
  }

  // --- DELETE THOUGHT ---
  if (action === "deleteThought") {
    const { thoughtId } = body
    await query(`DELETE FROM diary_thoughts WHERE id=$1`, [thoughtId])
    return NextResponse.json({ ok: true })
  }

  // --- TOGGLE BUFF/DEBUFF ---
  if (action === "toggle") {
    const { date, toggleId } = body
    await ensureEntry(date)
    // Try delete first — if it existed, we removed it (toggle off)
    const { rowCount } = await query(
      `DELETE FROM diary_toggles WHERE entry_date=$1 AND toggle_id=$2`,
      [date, toggleId]
    )
    if (rowCount === 0) {
      // Didn't exist — add it (toggle on)
      await query(
        `INSERT INTO diary_toggles (entry_date, toggle_id) VALUES ($1, $2)`,
        [date, toggleId]
      )
    }
    return NextResponse.json({ ok: true })
  }

  // --- TOGGLE BOOKMARK ---
  if (action === "toggleBookmark") {
    const { date } = body
    await ensureEntry(date)
    await query(
      `UPDATE diary_entries SET is_bookmarked = NOT is_bookmarked WHERE entry_date=$1`,
      [date]
    )
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
