import { Pool } from "pg"

const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "finapp",
  password: process.env.DB_PASSWORD || "finapp_secure_2026",
  database: process.env.DB_NAME || "finance_app",
  max: 10,
})

export function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params)
}

export default pool
