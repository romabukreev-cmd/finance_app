"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type {
  Account,
  AccountBalance,
  ActionResult,
  Category,
  CategoryKind,
  CreateAccountInput,
  CreateCategoryInput,
  CreateOperationInput,
  DeleteOperationInput,
  DisplayTransaction,
  FinanceBackup,
  FinanceState,
  Transaction,
  UpdateAccountInput,
  UpdateCategoryInput,
  UpdateOperationInput,
} from "@/lib/finance/types"

const STORAGE_KEY = "finance-mvp:state:v1"
const AUTO_BACKUPS_KEY = "finance-mvp:auto-backups:v1"
const AUTO_BACKUP_LAST_DAY_KEY = "finance-mvp:auto-backup:last-day:v1"
const AUTO_BACKUPS_LIMIT = 3

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function nowIso() {
  return new Date().toISOString()
}

function todayLocalDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function todayIsoDate() {
  return todayLocalDate()
}

function normalizeMoney(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.round(value * 100) / 100
}

function normalizeAccountStartBalance(type: Account["type"], rawValue: number) {
  const value = Math.abs(normalizeMoney(rawValue))
  return type === "debt" ? -value : value
}

function buildSystemCategory(kind: CategoryKind): Category {
  const timestamp = nowIso()

  return {
    id: createId(),
    name: "Прочее",
    kind,
    isSystem: true,
    isArchived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

function ensureSystemCategories(categories: Category[]) {
  const result = [...categories]
  const hasIncomeOther = result.some(
    (category) => category.kind === "income" && category.isSystem
  )
  const hasExpenseOther = result.some(
    (category) => category.kind === "expense" && category.isSystem
  )

  if (!hasIncomeOther) {
    result.push(buildSystemCategory("income"))
  }

  if (!hasExpenseOther) {
    result.push(buildSystemCategory("expense"))
  }

  return result
}

function getSystemCategoryId(categories: Category[], kind: CategoryKind) {
  return categories.find((category) => category.kind === kind && category.isSystem)?.id
}

function createInitialState(): FinanceState {
  return {
    accounts: [],
    categories: ensureSystemCategories([]),
    transactions: [],
  }
}

function normalizeState(raw: unknown): FinanceState {
  if (!raw || typeof raw !== "object") {
    return createInitialState()
  }

  const maybeState = raw as Partial<FinanceState>

  const accounts = Array.isArray(maybeState.accounts)
    ? (maybeState.accounts as Account[])
    : []
  const categories = Array.isArray(maybeState.categories)
    ? ensureSystemCategories(maybeState.categories as Category[])
    : ensureSystemCategories([])
  const transactions = Array.isArray(maybeState.transactions)
    ? (maybeState.transactions as Transaction[])
    : []

  return { accounts, categories, transactions }
}

function parseBackupPayload(raw: unknown): FinanceState | null {
  if (!raw || typeof raw !== "object") {
    return null
  }

  if ("accounts" in raw || "categories" in raw || "transactions" in raw) {
    return normalizeState(raw)
  }

  if ("state" in raw) {
    const maybeBackup = raw as Partial<FinanceBackup>
    return normalizeState(maybeBackup.state)
  }

  return null
}

function buildBackup(state: FinanceState): FinanceBackup {
  return {
    version: 1,
    exportedAt: nowIso(),
    state,
  }
}

function readAutoBackups(): FinanceBackup[] {
  try {
    const raw = localStorage.getItem(AUTO_BACKUPS_KEY)

    if (!raw) {
      return []
    }

    return parseAutoBackupsPayload(JSON.parse(raw))
  } catch {
    return []
  }
}

function parseAutoBackupsPayload(raw: unknown) {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null
      }

      const maybeBackup = item as Partial<FinanceBackup>
      const state = parseBackupPayload(maybeBackup)

      if (!state || !maybeBackup.exportedAt) {
        return null
      }

      return {
        version: 1,
        exportedAt: maybeBackup.exportedAt,
        state,
      } satisfies FinanceBackup
    })
    .filter((item): item is FinanceBackup => item !== null)
}

function keepRecentAutoBackups(backups: FinanceBackup[]) {
  return [...backups]
    .sort((left, right) => right.exportedAt.localeCompare(left.exportedAt))
    .slice(0, AUTO_BACKUPS_LIMIT)
}

function buildDisplayTransactions(transactions: Transaction[]) {
  const display: DisplayTransaction[] = []
  const transferGroups = new Map<
    string,
    { out?: Transaction; in?: Transaction; fallback: Transaction[] }
  >()

  for (const transaction of transactions) {
    if (transaction.type !== "transfer" || !transaction.transferId) {
      display.push({
        id: transaction.id,
        type: transaction.type,
        transactionDate: transaction.transactionDate,
        amount: transaction.amount,
        note: transaction.note,
        createdAt: transaction.createdAt,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        transferId: null,
        fromAccountId: null,
        toAccountId: null,
      })
      continue
    }

    const group = transferGroups.get(transaction.transferId) ?? {
      fallback: [],
    }
    group.fallback.push(transaction)

    if (transaction.transferDirection === "out") {
      group.out = transaction
    } else if (transaction.transferDirection === "in") {
      group.in = transaction
    }

    transferGroups.set(transaction.transferId, group)
  }

  for (const [transferId, group] of transferGroups.entries()) {
    if (group.out && group.in) {
      display.push({
        id: transferId,
        type: "transfer",
        transactionDate: group.out.transactionDate,
        amount: group.out.amount,
        note: group.out.note,
        createdAt: group.out.createdAt,
        accountId: null,
        categoryId: null,
        transferId,
        fromAccountId: group.out.accountId,
        toAccountId: group.in.accountId,
      })
      continue
    }

    for (const leg of group.fallback) {
      display.push({
        id: leg.id,
        type: "transfer",
        transactionDate: leg.transactionDate,
        amount: leg.amount,
        note: leg.note,
        createdAt: leg.createdAt,
        accountId: leg.accountId,
        categoryId: null,
        transferId,
        fromAccountId:
          leg.transferDirection === "out" ? leg.accountId : null,
        toAccountId:
          leg.transferDirection === "in" ? leg.accountId : null,
      })
    }
  }

  return display.sort((left, right) => {
    const dateDelta = right.transactionDate.localeCompare(left.transactionDate)

    if (dateDelta !== 0) {
      return dateDelta
    }

    return right.createdAt.localeCompare(left.createdAt)
  })
}

function buildBalances(accounts: Account[], transactions: Transaction[]): AccountBalance[] {
  const sums = new Map<string, number>()

  for (const transaction of transactions) {
    const current = sums.get(transaction.accountId) ?? 0
    sums.set(transaction.accountId, current + transaction.signedAmount)
  }

  return accounts.map((account) => ({
    account,
    balance: normalizeMoney(account.startBalance + (sums.get(account.id) ?? 0)),
  }))
}

type FinanceContextValue = {
  hydrated: boolean
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  autoBackups: FinanceBackup[]
  displayTransactions: DisplayTransaction[]
  balances: AccountBalance[]
  netWorth: number
  addAccount: (input: CreateAccountInput) => ActionResult
  updateAccount: (input: UpdateAccountInput) => ActionResult
  deleteAccount: (accountId: string) => ActionResult
  addCategory: (input: CreateCategoryInput) => ActionResult
  updateCategory: (input: UpdateCategoryInput) => ActionResult
  deleteCategory: (categoryId: string) => ActionResult
  createOperation: (input: CreateOperationInput) => ActionResult
  updateOperation: (input: UpdateOperationInput) => ActionResult
  deleteOperation: (input: DeleteOperationInput) => ActionResult
  exportBackup: () => string
  importBackup: (rawText: string) => ActionResult
  resetAllData: () => void
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FinanceState>(createInitialState)
  const [autoBackups, setAutoBackups] = useState<FinanceBackup[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let nextState = createInitialState()

    try {
      const raw = localStorage.getItem(STORAGE_KEY)

      if (raw) {
        nextState = normalizeState(JSON.parse(raw))
      }
    } catch {
      nextState = createInitialState()
    }

    const savedBackups = keepRecentAutoBackups(readAutoBackups())
    const today = todayLocalDate()
    const lastBackupDay = localStorage.getItem(AUTO_BACKUP_LAST_DAY_KEY)

    let nextBackups = savedBackups

    if (lastBackupDay !== today) {
      const dailyBackup = buildBackup(nextState)
      nextBackups = keepRecentAutoBackups([dailyBackup, ...savedBackups])
      localStorage.setItem(AUTO_BACKUPS_KEY, JSON.stringify(nextBackups))
      localStorage.setItem(AUTO_BACKUP_LAST_DAY_KEY, today)
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(nextState)
    setAutoBackups(nextBackups)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [hydrated, state])

  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          setState(normalizeState(JSON.parse(event.newValue)))
        } catch {
          // ignore malformed external state
        }
      }

      if (event.key === AUTO_BACKUPS_KEY) {
        if (!event.newValue) {
          setAutoBackups([])
          return
        }

        try {
          setAutoBackups(
            keepRecentAutoBackups(parseAutoBackupsPayload(JSON.parse(event.newValue)))
          )
        } catch {
          // ignore malformed external state
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const addAccount = useCallback((input: CreateAccountInput): ActionResult => {
    let result: ActionResult = { ok: true }

    setState((previous) => {
      const name = input.name.trim()

      if (!name) {
        result = { ok: false, error: "Название счета не может быть пустым." }
        return previous
      }

      const duplicate = previous.accounts.some(
        (account) => account.name.toLowerCase() === name.toLowerCase()
      )

      if (duplicate) {
        result = { ok: false, error: "Счет с таким названием уже существует." }
        return previous
      }

      const timestamp = nowIso()

      const newAccount: Account = {
        id: createId(),
        name,
        type: input.type,
        startBalance: normalizeAccountStartBalance(input.type, input.startBalance),
        startDate: input.startDate || todayIsoDate(),
        isArchived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      return {
        ...previous,
        accounts: [...previous.accounts, newAccount],
      }
    })

    return result
  }, [])

  const updateAccount = useCallback((input: UpdateAccountInput): ActionResult => {
    let result: ActionResult = { ok: true }

    setState((previous) => {
      const target = previous.accounts.find((account) => account.id === input.id)

      if (!target) {
        result = { ok: false, error: "Счет не найден." }
        return previous
      }

      const name = input.name.trim()

      if (!name) {
        result = { ok: false, error: "Название счета не может быть пустым." }
        return previous
      }

      const duplicate = previous.accounts.some(
        (account) =>
          account.id !== input.id && account.name.toLowerCase() === name.toLowerCase()
      )

      if (duplicate) {
        result = { ok: false, error: "Счет с таким названием уже существует." }
        return previous
      }

      return {
        ...previous,
        accounts: previous.accounts.map((account) => {
          if (account.id !== input.id) {
            return account
          }

          return {
            ...account,
            name,
            type: input.type,
            startBalance: normalizeAccountStartBalance(input.type, input.startBalance),
            startDate: input.startDate || todayIsoDate(),
            isArchived: input.isArchived,
            updatedAt: nowIso(),
          }
        }),
      }
    })

    return result
  }, [])

  const deleteAccount = useCallback((accountId: string): ActionResult => {
    let result: ActionResult = { ok: true }

    setState((previous) => {
      const inUse = previous.transactions.some(
        (transaction) => transaction.accountId === accountId
      )

      if (inUse) {
        result = {
          ok: false,
          error: "Нельзя удалить счет, пока к нему привязаны операции.",
        }
        return previous
      }

      const exists = previous.accounts.some((account) => account.id === accountId)

      if (!exists) {
        result = { ok: false, error: "Счет не найден." }
        return previous
      }

      return {
        ...previous,
        accounts: previous.accounts.filter((account) => account.id !== accountId),
      }
    })

    return result
  }, [])

  const addCategory = useCallback((input: CreateCategoryInput): ActionResult => {
    let result: ActionResult = { ok: true }

    setState((previous) => {
      const name = input.name.trim()

      if (!name) {
        result = { ok: false, error: "Название категории не может быть пустым." }
        return previous
      }

      const duplicate = previous.categories.some(
        (category) =>
          category.kind === input.kind &&
          category.name.toLowerCase() === name.toLowerCase()
      )

      if (duplicate) {
        result = { ok: false, error: "Категория с таким названием уже существует." }
        return previous
      }

      const timestamp = nowIso()
      const category: Category = {
        id: createId(),
        name,
        kind: input.kind,
        isSystem: false,
        isArchived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      return {
        ...previous,
        categories: [...previous.categories, category],
      }
    })

    return result
  }, [])

  const updateCategory = useCallback((input: UpdateCategoryInput): ActionResult => {
    let result: ActionResult = { ok: true }

    setState((previous) => {
      const target = previous.categories.find((category) => category.id === input.id)

      if (!target) {
        result = { ok: false, error: "Категория не найдена." }
        return previous
      }

      if (target.isSystem) {
        result = { ok: false, error: "Системную категорию нельзя редактировать." }
        return previous
      }

      const name = input.name.trim()

      if (!name) {
        result = { ok: false, error: "Название категории не может быть пустым." }
        return previous
      }

      const duplicate = previous.categories.some(
        (category) =>
          category.id !== input.id &&
          category.kind === target.kind &&
          category.name.toLowerCase() === name.toLowerCase()
      )

      if (duplicate) {
        result = { ok: false, error: "Категория с таким названием уже существует." }
        return previous
      }

      return {
        ...previous,
        categories: previous.categories.map((category) =>
          category.id === input.id
            ? {
                ...category,
                name,
                isArchived: input.isArchived,
                updatedAt: nowIso(),
              }
            : category
        ),
      }
    })

    return result
  }, [])

  const deleteCategory = useCallback((categoryId: string): ActionResult => {
    let result: ActionResult = { ok: true }

    setState((previous) => {
      const target = previous.categories.find((category) => category.id === categoryId)

      if (!target) {
        result = { ok: false, error: "Категория не найдена." }
        return previous
      }

      if (target.isSystem) {
        result = { ok: false, error: "Системную категорию «Прочее» удалять нельзя." }
        return previous
      }

      const fallbackId = getSystemCategoryId(previous.categories, target.kind)

      if (!fallbackId) {
        result = { ok: false, error: "Не найдена системная категория «Прочее»." }
        return previous
      }

      return {
        ...previous,
        categories: previous.categories.filter((category) => category.id !== categoryId),
        transactions: previous.transactions.map((transaction) =>
          transaction.categoryId === categoryId
            ? { ...transaction, categoryId: fallbackId, updatedAt: nowIso() }
            : transaction
        ),
      }
    })

    return result
  }, [])

  const createOperation = useCallback((input: CreateOperationInput): ActionResult => {
    let result: ActionResult = { ok: true }

    setState((previous) => {
      const amount = normalizeMoney(input.amount)

      if (amount <= 0) {
        result = { ok: false, error: "Сумма должна быть больше нуля." }
        return previous
      }

      if (!input.transactionDate) {
        result = { ok: false, error: "Выбери дату операции." }
        return previous
      }

      const timestamp = nowIso()
      const note = input.note?.trim() || null

      if (input.type === "transfer") {
        if (input.fromAccountId === input.toAccountId) {
          result = {
            ok: false,
            error: "Счет списания и счет зачисления должны отличаться.",
          }
          return previous
        }

        const hasFrom = previous.accounts.some(
          (account) => account.id === input.fromAccountId
        )
        const hasTo = previous.accounts.some((account) => account.id === input.toAccountId)

        if (!hasFrom || !hasTo) {
          result = { ok: false, error: "Выбери корректные счета для перевода." }
          return previous
        }

        const transferId = createId()

        const outLeg: Transaction = {
          id: createId(),
          transactionDate: input.transactionDate,
          type: "transfer",
          accountId: input.fromAccountId,
          categoryId: null,
          amount,
          signedAmount: -amount,
          transferId,
          transferDirection: "out",
          note,
          createdAt: timestamp,
          updatedAt: timestamp,
        }

        const inLeg: Transaction = {
          id: createId(),
          transactionDate: input.transactionDate,
          type: "transfer",
          accountId: input.toAccountId,
          categoryId: null,
          amount,
          signedAmount: amount,
          transferId,
          transferDirection: "in",
          note,
          createdAt: timestamp,
          updatedAt: timestamp,
        }

        return {
          ...previous,
          transactions: [...previous.transactions, outLeg, inLeg],
        }
      }

      const hasAccount = previous.accounts.some((account) => account.id === input.accountId)
      const category = previous.categories.find(
        (item) => item.id === input.categoryId && item.kind === input.type
      )

      if (!hasAccount) {
        result = { ok: false, error: "Выбери корректный счет." }
        return previous
      }

      if (!category) {
        result = { ok: false, error: "Выбери категорию." }
        return previous
      }

      const transaction: Transaction = {
        id: createId(),
        transactionDate: input.transactionDate,
        type: input.type,
        accountId: input.accountId,
        categoryId: input.categoryId,
        amount,
        signedAmount: input.type === "income" ? amount : -amount,
        transferId: null,
        transferDirection: null,
        note,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      return {
        ...previous,
        transactions: [...previous.transactions, transaction],
      }
    })

    return result
  }, [])

  const updateOperation = useCallback((input: UpdateOperationInput): ActionResult => {
    let result: ActionResult = { ok: true }

    setState((previous) => {
      const amount = normalizeMoney(input.amount)

      if (amount <= 0) {
        result = { ok: false, error: "Сумма должна быть больше нуля." }
        return previous
      }

      if (!input.transactionDate) {
        result = { ok: false, error: "Выбери дату операции." }
        return previous
      }

      const note = input.note?.trim() || null

      if (input.type === "transfer") {
        if (input.fromAccountId === input.toAccountId) {
          result = {
            ok: false,
            error: "Счет списания и счет зачисления должны отличаться.",
          }
          return previous
        }

        const outLeg = previous.transactions.find(
          (transaction) =>
            transaction.type === "transfer" &&
            transaction.transferId === input.transferId &&
            transaction.transferDirection === "out"
        )
        const inLeg = previous.transactions.find(
          (transaction) =>
            transaction.type === "transfer" &&
            transaction.transferId === input.transferId &&
            transaction.transferDirection === "in"
        )

        if (!outLeg || !inLeg) {
          result = { ok: false, error: "Не удалось найти обе ноги перевода." }
          return previous
        }

        return {
          ...previous,
          transactions: previous.transactions.map((transaction) => {
            if (transaction.id === outLeg.id) {
              return {
                ...transaction,
                transactionDate: input.transactionDate,
                accountId: input.fromAccountId,
                amount,
                signedAmount: -amount,
                note,
                updatedAt: nowIso(),
              }
            }

            if (transaction.id === inLeg.id) {
              return {
                ...transaction,
                transactionDate: input.transactionDate,
                accountId: input.toAccountId,
                amount,
                signedAmount: amount,
                note,
                updatedAt: nowIso(),
              }
            }

            return transaction
          }),
        }
      }

      const exists = previous.transactions.some(
        (transaction) => transaction.id === input.id && transaction.type === input.type
      )

      if (!exists) {
        result = { ok: false, error: "Операция не найдена." }
        return previous
      }

      const hasAccount = previous.accounts.some((account) => account.id === input.accountId)
      const hasCategory = previous.categories.some(
        (category) => category.id === input.categoryId && category.kind === input.type
      )

      if (!hasAccount) {
        result = { ok: false, error: "Выбери корректный счет." }
        return previous
      }

      if (!hasCategory) {
        result = { ok: false, error: "Выбери корректную категорию." }
        return previous
      }

      return {
        ...previous,
        transactions: previous.transactions.map((transaction) => {
          if (transaction.id !== input.id) {
            return transaction
          }

          return {
            ...transaction,
            transactionDate: input.transactionDate,
            accountId: input.accountId,
            categoryId: input.categoryId,
            amount,
            signedAmount: input.type === "income" ? amount : -amount,
            note,
            updatedAt: nowIso(),
          }
        }),
      }
    })

    return result
  }, [])

  const deleteOperation = useCallback((input: DeleteOperationInput): ActionResult => {
    let result: ActionResult = { ok: true }

    setState((previous) => {
      if (input.type === "transfer") {
        const exists = previous.transactions.some(
          (transaction) =>
            transaction.type === "transfer" && transaction.transferId === input.transferId
        )

        if (!exists) {
          result = { ok: false, error: "Перевод не найден." }
          return previous
        }

        return {
          ...previous,
          transactions: previous.transactions.filter(
            (transaction) =>
              !(transaction.type === "transfer" && transaction.transferId === input.transferId)
          ),
        }
      }

      const exists = previous.transactions.some(
        (transaction) => transaction.id === input.id && transaction.type === input.type
      )

      if (!exists) {
        result = { ok: false, error: "Операция не найдена." }
        return previous
      }

      return {
        ...previous,
        transactions: previous.transactions.filter(
          (transaction) => transaction.id !== input.id
        ),
      }
    })

    return result
  }, [])

  const exportBackup = useCallback(() => {
    return JSON.stringify(buildBackup(state), null, 2)
  }, [state])

  const importBackup = useCallback((rawText: string): ActionResult => {
    try {
      const parsed = JSON.parse(rawText)
      const nextState = parseBackupPayload(parsed)

      if (!nextState) {
        return {
          ok: false,
          error: "Неверный формат файла. Выбери корректный JSON бэкап.",
        }
      }

      setState(nextState)
      return { ok: true }
    } catch {
      return { ok: false, error: "Не удалось прочитать JSON файл бэкапа." }
    }
  }, [])

  const resetAllData = useCallback(() => {
    setState(createInitialState())
  }, [])

  const displayTransactions = useMemo(
    () => buildDisplayTransactions(state.transactions),
    [state.transactions]
  )

  const balances = useMemo(
    () => buildBalances(state.accounts, state.transactions),
    [state.accounts, state.transactions]
  )

  const netWorth = useMemo(
    () => normalizeMoney(balances.reduce((sum, item) => sum + item.balance, 0)),
    [balances]
  )

  const value = useMemo<FinanceContextValue>(
    () => ({
      hydrated,
      accounts: state.accounts,
      categories: state.categories,
      transactions: state.transactions,
      autoBackups,
      displayTransactions,
      balances,
      netWorth,
      addAccount,
      updateAccount,
      deleteAccount,
      addCategory,
      updateCategory,
      deleteCategory,
      createOperation,
      updateOperation,
      deleteOperation,
      exportBackup,
      importBackup,
      resetAllData,
    }),
    [
      hydrated,
      state.accounts,
      state.categories,
      state.transactions,
      autoBackups,
      displayTransactions,
      balances,
      netWorth,
      addAccount,
      updateAccount,
      deleteAccount,
      addCategory,
      updateCategory,
      deleteCategory,
      createOperation,
      updateOperation,
      deleteOperation,
      exportBackup,
      importBackup,
      resetAllData,
    ]
  )

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const context = useContext(FinanceContext)

  if (!context) {
    throw new Error("useFinance must be used inside FinanceProvider")
  }

  return context
}
