import { NextResponse, type NextRequest } from "next/server"

const AUTH_SECRET = process.env.AUTH_SECRET ?? ""
const MCP_API_TOKEN = process.env.MCP_API_TOKEN ?? ""
const COOKIE_NAME = "auth"
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

/**
 * Constant-time string comparison (Edge-compatible, no Node crypto).
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

// Routes that don't require auth
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
]

/**
 * Edge-compatible HMAC-SHA256 verification (Web Crypto API).
 * Token format: "<timestamp>.<base64url(hmac)>"
 */
async function verifyToken(token: string): Promise<boolean> {
  if (!AUTH_SECRET) return false
  const dot = token.lastIndexOf(".")
  if (dot <= 0) return false
  const payload = token.slice(0, dot)
  const signature = token.slice(dot + 1)
  const issuedAt = Number(payload)
  if (!Number.isFinite(issuedAt)) return false
  if (Date.now() - issuedAt > SESSION_TTL_MS) return false

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  )
  const sigBytes = Uint8Array.from(
    atob(signature.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  )
  return crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest"
  ) {
    return NextResponse.next()
  }

  // Check Bearer token first (for MCP / API-only clients)
  const authHeader = req.headers.get("authorization") ?? ""
  if (authHeader.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim()
    if (MCP_API_TOKEN && bearer && safeEqual(bearer, MCP_API_TOKEN)) {
      return NextResponse.next()
    }
  }

  // Check auth cookie (browser session)
  const token = req.cookies.get(COOKIE_NAME)?.value
  const valid = token ? await verifyToken(token) : false

  if (!valid) {
    // API routes: return 401 JSON instead of HTML redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const loginUrl = new URL("/login", req.url)
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
