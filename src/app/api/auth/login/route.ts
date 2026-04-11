import { NextRequest, NextResponse } from "next/server"

const AUTH_PASSWORD = process.env.AUTH_PASSWORD ?? ""
const AUTH_SECRET = process.env.AUTH_SECRET ?? ""
const COOKIE_NAME = "auth"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Пароль не указан" }, { status: 400 })
  }

  if (!AUTH_PASSWORD || !AUTH_SECRET) {
    return NextResponse.json({ error: "Сервер не настроен" }, { status: 500 })
  }

  if (password !== AUTH_PASSWORD) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: COOKIE_NAME,
    value: AUTH_SECRET,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  })
  return res
}
