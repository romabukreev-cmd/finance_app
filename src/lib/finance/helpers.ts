import type { Account, Category, TransactionType } from "@/lib/finance/types"
import { todayIsoDate } from "@/lib/finance/format"

export type OperationFormState = {
  transactionDate: string
  amount: string
  accountId: string
  categoryId: string
  fromAccountId: string
  toAccountId: string
  note: string
}

export function findName<T extends { id: string; name: string }>(
  items: T[],
  id: string | null,
  fallback = "—"
) {
  if (!id) return fallback
  return items.find((item) => item.id === id)?.name ?? fallback
}

export function defaultCategoryId(
  type: TransactionType,
  incomeCategories: Category[],
  expenseCategories: Category[]
) {
  if (type === "income") return incomeCategories[0]?.id ?? ""
  if (type === "expense") return expenseCategories[0]?.id ?? ""
  return ""
}

export function buildOperationForm(
  type: TransactionType,
  activeAccounts: Account[],
  incomeCategories: Category[],
  expenseCategories: Category[]
): OperationFormState {
  const defaultAccountId = activeAccounts[0]?.id ?? ""

  return {
    transactionDate: todayIsoDate(),
    amount: "",
    accountId: defaultAccountId,
    categoryId: defaultCategoryId(type, incomeCategories, expenseCategories),
    fromAccountId: defaultAccountId,
    toAccountId: activeAccounts[1]?.id ?? defaultAccountId,
    note: "",
  }
}
