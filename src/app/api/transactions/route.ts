import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

function mapRow(r: Record<string, unknown>) {
  return {
    id: r.id,
    transactionDate: String(r.transaction_date).slice(0, 10),
    type: r.type,
    accountId: r.account_id,
    categoryId: r.category_id,
    amount: Number(r.amount),
    signedAmount: Number(r.signed_amount),
    transferId: r.transfer_id,
    transferDirection: r.transfer_direction,
    note: r.note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export async function GET() {
  const { rows } = await query(`
    SELECT * FROM transactions ORDER BY transaction_date DESC, created_at DESC
  `)
  return NextResponse.json(rows.map(mapRow))
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.type === "transfer") {
    const transferId = crypto.randomUUID()
    const { transactionDate, fromAccountId, toAccountId, amount, note } = body

    await query(
      `INSERT INTO transactions (transaction_date, type, account_id, amount, signed_amount, transfer_id, transfer_direction, note)
       VALUES ($1, 'transfer', $2, $3, $4, $5, 'out', $6)`,
      [transactionDate, fromAccountId, amount, -amount, transferId, note || null]
    )
    await query(
      `INSERT INTO transactions (transaction_date, type, account_id, amount, signed_amount, transfer_id, transfer_direction, note)
       VALUES ($1, 'transfer', $2, $3, $4, $5, 'in', $6)`,
      [transactionDate, toAccountId, amount, amount, transferId, note || null]
    )
    return NextResponse.json({ ok: true, transferId }, { status: 201 })
  }

  if (body.type === "adjustment") {
    const { transactionDate, accountId, signedAmount, note } = body
    const amount = Math.abs(signedAmount)
    const { rows } = await query(
      `INSERT INTO transactions (transaction_date, type, account_id, amount, signed_amount, note)
       VALUES ($1, 'adjustment', $2, $3, $4, $5) RETURNING *`,
      [transactionDate, accountId, amount, signedAmount, note || null]
    )
    return NextResponse.json(mapRow(rows[0]), { status: 201 })
  }

  const { transactionDate, type, accountId, categoryId, amount, note } = body
  const signedAmount = type === "income" ? amount : -amount

  const { rows } = await query(
    `INSERT INTO transactions (transaction_date, type, account_id, category_id, amount, signed_amount, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [transactionDate, type, accountId, categoryId, amount, signedAmount, note || null]
  )
  return NextResponse.json(mapRow(rows[0]), { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()

  if (body.type === "transfer") {
    const { transferId, transactionDate, fromAccountId, toAccountId, amount, note } = body
    await query(
      `UPDATE transactions SET transaction_date=$1, account_id=$2, amount=$3, signed_amount=$4, note=$5, updated_at=NOW()
       WHERE transfer_id=$6 AND transfer_direction='out'`,
      [transactionDate, fromAccountId, amount, -amount, note || null, transferId]
    )
    await query(
      `UPDATE transactions SET transaction_date=$1, account_id=$2, amount=$3, signed_amount=$4, note=$5, updated_at=NOW()
       WHERE transfer_id=$6 AND transfer_direction='in'`,
      [transactionDate, toAccountId, amount, amount, note || null, transferId]
    )
    return NextResponse.json({ ok: true })
  }

  if (body.type === "adjustment") {
    const { id, transactionDate, accountId, signedAmount, note } = body
    const amount = Math.abs(signedAmount)
    const { rows } = await query(
      `UPDATE transactions SET transaction_date=$1, account_id=$2, amount=$3, signed_amount=$4, note=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [transactionDate, accountId, amount, signedAmount, note || null, id]
    )
    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(mapRow(rows[0]))
  }

  const { id, transactionDate, accountId, categoryId, amount, note, type } = body
  const signedAmount = type === "income" ? amount : -amount

  const { rows } = await query(
    `UPDATE transactions SET transaction_date=$1, account_id=$2, category_id=$3, amount=$4, signed_amount=$5, note=$6, updated_at=NOW()
     WHERE id=$7 RETURNING *`,
    [transactionDate, accountId, categoryId, amount, signedAmount, note || null, id]
  )
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(mapRow(rows[0]))
}

export async function DELETE(req: NextRequest) {
  const body = await req.json()

  if (body.transferId) {
    await query(`DELETE FROM transactions WHERE transfer_id=$1`, [body.transferId])
  } else {
    await query(`DELETE FROM transactions WHERE id=$1`, [body.id])
  }
  return NextResponse.json({ ok: true })
}
