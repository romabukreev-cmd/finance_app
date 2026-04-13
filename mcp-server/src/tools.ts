import { z } from "zod"
import { api } from "./api-client.js"

/**
 * MCP tool definition. Each tool gets registered with the MCP server.
 */
export type Tool = {
  name: string
  description: string
  inputSchema: z.ZodTypeAny
  handler: (args: any) => Promise<unknown>
}

const todayDate = () => new Date().toISOString().slice(0, 10)

// ============================================================================
// FINANCES — accounts, transactions, categories
// ============================================================================

const financeTools: Tool[] = [
  {
    name: "list_accounts",
    description: "List all financial accounts (assets and debts) with their balances.",
    inputSchema: z.object({}),
    handler: async () => api("/api/accounts"),
  },
  {
    name: "create_account",
    description: "Create a new financial account.",
    inputSchema: z.object({
      name: z.string().describe("Account name, e.g. 'Сбер', 'Тинькофф', 'Долг по карте'"),
      type: z.enum(["asset", "debt"]).describe("'asset' for owned money, 'debt' for liabilities"),
      color: z.string().optional().describe("Tailwind color name like 'emerald', 'sky', 'rose'. Default: 'slate'"),
      startBalance: z.number().describe("Initial balance. Positive number — sign is set by type."),
      startDate: z.string().optional().describe("ISO date YYYY-MM-DD. Default: today."),
    }),
    handler: async (args) => api("/api/accounts", { method: "POST", body: args }),
  },
  {
    name: "update_account",
    description: "Update an existing account.",
    inputSchema: z.object({
      id: z.string().uuid(),
      name: z.string(),
      type: z.enum(["asset", "debt"]),
      color: z.string(),
      startBalance: z.number(),
      startDate: z.string(),
      isArchived: z.boolean().optional().default(false),
    }),
    handler: async (args) => api("/api/accounts", { method: "PUT", body: args }),
  },
  {
    name: "delete_account",
    description: "Delete an account by id.",
    inputSchema: z.object({ id: z.string().uuid() }),
    handler: async (args) => api("/api/accounts", { method: "DELETE", body: args }),
  },
  {
    name: "list_categories",
    description: "List all transaction categories (income and expense).",
    inputSchema: z.object({}),
    handler: async () => api("/api/categories"),
  },
  {
    name: "create_category",
    description: "Create a new transaction category.",
    inputSchema: z.object({
      name: z.string(),
      kind: z.enum(["income", "expense"]),
      color: z.string().describe("Tailwind color name. Default: 'gray'."),
    }),
    handler: async (args) => api("/api/categories", { method: "POST", body: args }),
  },
  {
    name: "list_transactions",
    description: "List all transactions, sorted newest first.",
    inputSchema: z.object({}),
    handler: async () => api("/api/transactions"),
  },
  {
    name: "create_transaction",
    description:
      "Create a transaction. Use type='income' or 'expense' with categoryId. " +
      "For 'transfer' between accounts use fromAccountId/toAccountId. " +
      "For 'adjustment' (balance correction) use signedAmount (can be negative).",
    inputSchema: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("income"),
        transactionDate: z.string().describe("ISO date YYYY-MM-DD"),
        accountId: z.string().uuid(),
        categoryId: z.string().uuid(),
        amount: z.number().positive(),
        note: z.string().optional(),
      }),
      z.object({
        type: z.literal("expense"),
        transactionDate: z.string(),
        accountId: z.string().uuid(),
        categoryId: z.string().uuid(),
        amount: z.number().positive(),
        note: z.string().optional(),
      }),
      z.object({
        type: z.literal("transfer"),
        transactionDate: z.string(),
        fromAccountId: z.string().uuid(),
        toAccountId: z.string().uuid(),
        amount: z.number().positive(),
        note: z.string().optional(),
      }),
      z.object({
        type: z.literal("adjustment"),
        transactionDate: z.string(),
        accountId: z.string().uuid(),
        signedAmount: z.number().describe("Positive to increase balance, negative to decrease"),
        note: z.string().optional(),
      }),
    ]),
    handler: async (args) => api("/api/transactions", { method: "POST", body: args }),
  },
  {
    name: "update_transaction",
    description: "Update an existing income/expense/transfer/adjustment transaction.",
    inputSchema: z.object({
      type: z.enum(["income", "expense", "transfer", "adjustment"]),
      id: z.string().uuid().optional(),
      transferId: z.string().uuid().optional(),
      transactionDate: z.string(),
      accountId: z.string().uuid().optional(),
      fromAccountId: z.string().uuid().optional(),
      toAccountId: z.string().uuid().optional(),
      categoryId: z.string().uuid().optional(),
      amount: z.number().optional(),
      signedAmount: z.number().optional(),
      note: z.string().optional(),
    }),
    handler: async (args) => api("/api/transactions", { method: "PUT", body: args }),
  },
  {
    name: "delete_transaction",
    description: "Delete a transaction. Use 'id' for income/expense/adjustment, 'transferId' for transfer.",
    inputSchema: z.object({
      id: z.string().uuid().optional(),
      transferId: z.string().uuid().optional(),
    }),
    handler: async (args) => api("/api/transactions", { method: "DELETE", body: args }),
  },
]

// ============================================================================
// DIARY — entries, thoughts, buffs/debuffs, bookmarks
// ============================================================================

const diaryTools: Tool[] = [
  {
    name: "get_diary_entries",
    description:
      "Get diary entries for a date range. Returns entries with thoughts, active buffs/debuffs, bookmark state.",
    inputSchema: z.object({
      from: z.string().describe("ISO date YYYY-MM-DD (inclusive)"),
      to: z.string().describe("ISO date YYYY-MM-DD (inclusive)"),
    }),
    handler: async (args) => api("/api/diary", { query: args }),
  },
  {
    name: "add_diary_thought",
    description: "Add a thought/note to a diary entry. Creates the entry if it doesn't exist.",
    inputSchema: z.object({
      date: z.string().describe("ISO date YYYY-MM-DD"),
      text: z.string().describe("Thought text. Supports markdown: **bold**, *italic*, ~~strike~~"),
      categoryIds: z.array(z.string()).default([]).describe(
        "Category IDs from constants: dcat-studio, dcat-idea, dcat-auto, dcat-read, dcat-media, dcat-personal"
      ),
    }),
    handler: async (args) => api("/api/diary", { method: "POST", body: { action: "addThought", ...args } }),
  },
  {
    name: "update_diary_thought",
    description: "Update text or categories of an existing thought.",
    inputSchema: z.object({
      thoughtId: z.string().uuid(),
      text: z.string(),
      categoryIds: z.array(z.string()).default([]),
    }),
    handler: async (args) => api("/api/diary", { method: "POST", body: { action: "updateThought", ...args } }),
  },
  {
    name: "delete_diary_thought",
    description: "Delete a thought by id.",
    inputSchema: z.object({ thoughtId: z.string().uuid() }),
    handler: async (args) => api("/api/diary", { method: "POST", body: { action: "deleteThought", ...args } }),
  },
  {
    name: "toggle_diary_buff_debuff",
    description:
      "Toggle a buff or debuff for a date. " +
      "Buffs: buff-walk, buff-morning, buff-shower, buff-water, buff-food, buff-workout, buff-read, buff-vitamins. " +
      "Debuffs: debuff-home, debuff-scroll, debuff-junk, debuff-sweet, debuff-sleep, debuff-night.",
    inputSchema: z.object({
      date: z.string(),
      toggleId: z.string().describe("e.g. 'buff-walk' or 'debuff-sleep'"),
    }),
    handler: async (args) => api("/api/diary", { method: "POST", body: { action: "toggle", ...args } }),
  },
  {
    name: "toggle_diary_bookmark",
    description: "Toggle the bookmark/star flag on a diary entry.",
    inputSchema: z.object({ date: z.string() }),
    handler: async (args) => api("/api/diary", { method: "POST", body: { action: "toggleBookmark", ...args } }),
  },
]

// ============================================================================
// PLANNER — tasks, subtasks, work hours
// ============================================================================

const plannerTools: Tool[] = [
  {
    name: "list_tasks",
    description:
      "List all planner tasks across all dates. Each task includes status, priority, direction, " +
      "spent time (timer_accumulated in seconds), and subtasks.",
    inputSchema: z.object({}),
    handler: async () => api("/api/tasks"),
  },
  {
    name: "create_task",
    description: "Create a planner task.",
    inputSchema: z.object({
      title: z.string(),
      status: z.enum(["todo", "in_progress", "done"]).optional().default("todo"),
      priority: z
        .enum(["urgent", "key", "important", "regular", "normal"])
        .optional()
        .default("normal"),
      directionId: z
        .string()
        .nullable()
        .optional()
        .describe(
          "Work direction id: dir-studio, dir-dev, dir-ai, dir-media, dir-self, dir-learning. Null = no direction."
        ),
      taskDate: z.string().optional().describe("ISO date YYYY-MM-DD. Default: today."),
      notes: z.string().optional(),
    }),
    handler: async (args) => api("/api/tasks", { method: "POST", body: args }),
  },
  {
    name: "update_task",
    description:
      "Update task fields. Pass only the fields you want to change. " +
      "Use 'timerAccumulated' (in seconds) to set spent time.",
    inputSchema: z.object({
      id: z.string().uuid(),
      title: z.string().optional(),
      notes: z.string().nullable().optional(),
      status: z.enum(["todo", "in_progress", "done"]).optional(),
      priority: z.enum(["urgent", "key", "important", "regular", "normal"]).optional(),
      directionId: z.string().nullable().optional(),
      taskDate: z.string().optional(),
      sortOrder: z.number().int().optional(),
      timerAccumulated: z.number().int().nonnegative().optional().describe("Spent time in seconds"),
    }),
    handler: async (args) => api("/api/tasks", { method: "PUT", body: args }),
  },
  {
    name: "delete_task",
    description: "Delete a task by id (also deletes its subtasks).",
    inputSchema: z.object({ id: z.string().uuid() }),
    handler: async (args) => api("/api/tasks", { method: "DELETE", body: args }),
  },
  {
    name: "reorder_tasks",
    description: "Bulk update sort order and (optionally) status of multiple tasks at once.",
    inputSchema: z.object({
      items: z.array(
        z.object({
          id: z.string().uuid(),
          sortOrder: z.number().int(),
          status: z.enum(["todo", "in_progress", "done"]).optional(),
        })
      ),
    }),
    handler: async (args) => api("/api/tasks", { method: "PATCH", body: args }),
  },
  {
    name: "create_subtask",
    description: "Add a subtask (checkbox) to an existing task.",
    inputSchema: z.object({
      taskId: z.string().uuid(),
      title: z.string(),
    }),
    handler: async (args) => api("/api/subtasks", { method: "POST", body: args }),
  },
  {
    name: "update_subtask",
    description: "Update a subtask: rename, mark done/undone, change order.",
    inputSchema: z.object({
      id: z.string().uuid(),
      title: z.string().optional(),
      isDone: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }),
    handler: async (args) => api("/api/subtasks", { method: "PUT", body: args }),
  },
  {
    name: "delete_subtask",
    description: "Delete a subtask by id.",
    inputSchema: z.object({ id: z.string().uuid() }),
    handler: async (args) => api("/api/subtasks", { method: "DELETE", body: args }),
  },
  {
    name: "get_work_hours",
    description:
      "Get aggregated work time per direction. " +
      "Pass either 'date' (single day) or 'from'+'to' (range). " +
      "Returns: { 'YYYY-MM-DD': { directionId: totalSeconds } }.",
    inputSchema: z.object({
      date: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
    handler: async (args) => api("/api/work-hours", { query: args }),
  },
]

// ============================================================================
// META — helpers
// ============================================================================

const metaTools: Tool[] = [
  {
    name: "get_today_date",
    description: "Get today's date in ISO format (YYYY-MM-DD) according to the server.",
    inputSchema: z.object({}),
    handler: async () => ({ date: todayDate() }),
  },
  {
    name: "get_constants",
    description:
      "Get reference constants used across the app: work directions, diary categories, " +
      "buffs/debuffs, task priorities and statuses. Use this to look up valid IDs and labels.",
    inputSchema: z.object({}),
    handler: async () => ({
      workDirections: [
        { id: "dir-studio", name: "Студия", color: "emerald" },
        { id: "dir-dev", name: "Разработка", color: "sky" },
        { id: "dir-ai", name: "Изучение ИИ", color: "violet" },
        { id: "dir-media", name: "Медийка", color: "orange" },
        { id: "dir-self", name: "Саморазвитие", color: "teal" },
        { id: "dir-learning", name: "Обучение", color: "amber" },
      ],
      diaryCategories: [
        { id: "dcat-studio", name: "Студия", color: "emerald" },
        { id: "dcat-idea", name: "Идея", color: "amber" },
        { id: "dcat-auto", name: "Разработка", color: "sky" },
        { id: "dcat-read", name: "Чтение", color: "indigo" },
        { id: "dcat-media", name: "Медийка", color: "orange" },
        { id: "dcat-personal", name: "Личное", color: "violet" },
      ],
      buffs: [
        { id: "buff-walk", name: "Прогулка", emoji: "🚶" },
        { id: "buff-morning", name: "Разминка", emoji: "🧘" },
        { id: "buff-shower", name: "Контрастный душ", emoji: "🚿" },
        { id: "buff-water", name: "Стакан воды", emoji: "💧" },
        { id: "buff-food", name: "Здоровое питание", emoji: "🥗" },
        { id: "buff-workout", name: "Тренировка", emoji: "💪" },
        { id: "buff-read", name: "Чтение", emoji: "📖" },
        { id: "buff-vitamins", name: "Витамины", emoji: "💊" },
      ],
      debuffs: [
        { id: "debuff-home", name: "Мало кислорода", emoji: "🏠" },
        { id: "debuff-scroll", name: "Думскролл", emoji: "📱" },
        { id: "debuff-junk", name: "Фастфуд", emoji: "🍔" },
        { id: "debuff-sweet", name: "Сладкое", emoji: "🍬" },
        { id: "debuff-sleep", name: "Мало сна", emoji: "😴" },
        { id: "debuff-night", name: "Ночной сёрфинг", emoji: "🌙" },
      ],
      taskPriorities: [
        { value: "urgent", label: "Горит", color: "red" },
        { value: "key", label: "Ключевая", color: "violet" },
        { value: "important", label: "Важная", color: "amber" },
        { value: "regular", label: "Регулярная", color: "emerald" },
        { value: "normal", label: "Обычная", color: "gray" },
      ],
      taskStatuses: [
        { value: "todo", label: "Очередь" },
        { value: "in_progress", label: "Делаю" },
        { value: "done", label: "Сделал" },
      ],
    }),
  },
]

export const allTools: Tool[] = [...financeTools, ...diaryTools, ...plannerTools, ...metaTools]
