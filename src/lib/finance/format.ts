import type { AccountType, TransactionType } from "@/lib/finance/types"

export function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(value)
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export function monthKey(dateValue: string) {
  return dateValue.slice(0, 7)
}

export function transactionTypeLabel(type: TransactionType) {
  if (type === "income") {
    return "Доход"
  }

  if (type === "expense") {
    return "Расход"
  }

  return "Перевод"
}

export function accountTypeLabel(type: AccountType) {
  if (type === "debt") {
    return "Долг"
  }

  return "Актив"
}
