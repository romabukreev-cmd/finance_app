import express from "express"
import { randomUUID } from "node:crypto"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import { allTools } from "./tools.js"

const PORT = Number(process.env.MCP_PORT ?? 3200)
const ACCESS_TOKEN = process.env.MCP_ACCESS_TOKEN ?? ""

if (!ACCESS_TOKEN) {
  console.error("[mcp] FATAL: MCP_ACCESS_TOKEN env var is required")
  process.exit(1)
}

/**
 * Build a fresh MCP server instance with all tools registered.
 * One per HTTP session.
 */
function buildServer() {
  const server = new McpServer(
    { name: "super-app-mcp", version: "1.0.0" },
    { capabilities: { tools: {}, logging: {} } }
  )

  for (const tool of allTools) {
    // SDK expects a Zod raw shape (field map), not a ZodObject itself.
    // All our schemas are z.object(...) — extract .shape.
    const shape = (tool.inputSchema as any).shape ?? {}

    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: shape,
      },
      async (args: any) => {
        try {
          const result = await tool.handler(args ?? {})
          return {
            content: [
              {
                type: "text" as const,
                text:
                  typeof result === "string"
                    ? result
                    : JSON.stringify(result, null, 2),
              },
            ],
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          return {
            isError: true,
            content: [{ type: "text" as const, text: `Error: ${msg}` }],
          }
        }
      }
    )
  }

  return server
}

const app = express()
app.use(express.json({ limit: "4mb" }))

// Bearer token check
app.use((req, res, next) => {
  if (req.path === "/health") return next()
  const auth = req.headers.authorization ?? ""
  if (!auth.startsWith("Bearer ") || auth.slice(7).trim() !== ACCESS_TOKEN) {
    res.status(401).json({ error: "Unauthorized" })
    return
  }
  next()
})

app.get("/health", (_req, res) => {
  res.json({ ok: true, tools: allTools.length })
})

// Map of session id → transport (Streamable HTTP keeps a session)
const transports = new Map<string, StreamableHTTPServerTransport>()

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined
  let transport = sessionId ? transports.get(sessionId) : undefined

  if (!transport && isInitializeRequest(req.body)) {
    // New session
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports.set(id, transport!)
      },
    })

    transport.onclose = () => {
      if (transport!.sessionId) transports.delete(transport!.sessionId)
    }

    const server = buildServer()
    await server.connect(transport)
  } else if (!transport) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: no valid session id" },
      id: null,
    })
    return
  }

  await transport.handleRequest(req, res, req.body)
})

// SSE notifications + session termination
const handleSession = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined
  const transport = sessionId ? transports.get(sessionId) : undefined
  if (!transport) {
    res.status(400).send("Invalid or missing session ID")
    return
  }
  await transport.handleRequest(req, res)
}

app.get("/mcp", handleSession)
app.delete("/mcp", handleSession)

app.listen(PORT, () => {
  console.log(`[mcp] super-app MCP server listening on :${PORT} (${allTools.length} tools)`)
})
