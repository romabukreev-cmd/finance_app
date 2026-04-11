import { NextResponse, type NextRequest } from "next/server"

const AUTH_SECRET = process.env.AUTH_SECRET ?? ""
const COOKIE_NAME = "auth"

// Routes that don't require auth
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
]

export function middleware(req: NextRequest) {
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

  // Check auth cookie
  const cookie = req.cookies.get(COOKIE_NAME)?.value
  if (!cookie || !AUTH_SECRET || cookie !== AUTH_SECRET) {
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
