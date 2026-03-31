import type { AccountType, TransactionType } from "@/lib/finance/types"

export function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(value)
}

export function todayIsoDate() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
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
