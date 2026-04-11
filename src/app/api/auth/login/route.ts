import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"

const AUTH_PASSWORD = process.env.AUTH_PASSWORD ?? ""
const AUTH_SECRET = process.env.AUTH_SECRET ?? ""
const COOKIE_NAME = "auth"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

// In-memory rate limiter — 10 attempts / minute per IP
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 10
const WINDOW_MS = 60_000

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const rec = attempts.get(ip)
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (rec.count >= MAX_ATTEMPTS) return false
  rec.count += 1
  return true
}

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

/**
 * Signs a timestamp with HMAC-SHA256 using AUTH_SECRET.
 * Returns "<timestamp>.<base64url(hmac)>"
 */
function signToken(timestamp: number): string {
  const payload = String(timestamp)
  const mac = createHmac("sha256", AUTH_SECRET).update(payload).digest()
  const b64 = mac.toString("base64url")
  return `${payload}.${b64}`
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте через минуту." },
      { status: 429 }
    )
  }

  const { password } = await req.json()

  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Пароль не указан" }, { status: 400 })
  }

  if (!AUTH_PASSWORD || !AUTH_SECRET) {
    return NextResponse.json({ error: "Сервер не настроен" }, { status: 500 })
  }

  if (!safeCompare(password, AUTH_PASSWORD)) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 })
  }

  const token = signToken(Date.now())

  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  })
  return res
}
