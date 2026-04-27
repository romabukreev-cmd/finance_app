import { Pool, types } from "pg"

// По умолчанию pg парсит тип date (OID 1082) как JS Date,
// из-за чего String(date) даёт "Wed Apr 01" вместо "2026-04-01".
// Возвращаем дату как строку без изменений.
types.setTypeParser(1082, (val: string) => val)

const pool = new Pool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "finapp",
  password: process.env.DB_PASSWORD || "finapp_secure_2026",
  database: process.env.DB_NAME || "finance_app",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
})

export function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params)
}

export default pool
