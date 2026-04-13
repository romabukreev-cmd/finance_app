/**
 * Thin HTTP client to the super-app Next.js API.
 * Authenticates with Bearer token (MCP_API_TOKEN).
 */

const APP_URL = process.env.APP_URL ?? "http://127.0.0.1:3100"
const APP_TOKEN = process.env.MCP_API_TOKEN ?? ""

if (!APP_TOKEN) {
  console.error("[mcp] MCP_API_TOKEN is not set")
}

export type FetchOpts = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  body?: unknown
  query?: Record<string, string | number | undefined>
}

export async function api<T = unknown>(path: string, opts: FetchOpts = {}): Promise<T> {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, APP_URL)
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    }
  }
  const res = await fetch(url.toString(), {
    method: opts.method ?? "GET",
    headers: {
      "Authorization": `Bearer ${APP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`API ${opts.method ?? "GET"} ${path} failed: ${res.status} ${text}`)
  }
  const ct = res.headers.get("content-type") ?? ""
  if (ct.includes("application/json")) return (await res.json()) as T
  return (await res.text()) as unknown as T
}
