"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Plus } from "lucide-react"
import { useFinance } from "@/components/finance/finance-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { todayIsoDate } from "@/lib/finance/format"
import { findName } from "@/lib/finance/helpers"
import { categoryBadgeClass, normalizeCategoryColor } from "@/lib/finance/category-colors"
import { accountCardColorClass } from "@/lib/finance/account-colors"
import type { TransactionType } from "@/lib/finance/types"
import { cn } from "@/lib/utils"

export function QuickInputBar() {
  const { accounts, categories, createOperation } = useFinance()

  const activeAccounts = useMemo(
    () => accounts.filter((a) => !a.isArchived),
    [accounts]
  )
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.kind === "income" && !c.isArchived),
    [categories]
  )
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.kind === "expense" && !c.isArchived),
    [categories]
  )

  const [type, setType] = useState<TransactionType>("expense")
  const [date, setDate] = useState(todayIsoDate())
  const [amount, setAmount] = useState("")
  const [accountId, setAccountId] = useState(activeAccounts[0]?.id ?? "")
  const [fromAccountId, setFromAccountId] = useState(activeAccounts[0]?.id ?? "")
  const [toAccountId, setToAccountId] = useState(activeAccounts[1]?.id ?? activeAccounts[0]?.id ?? "")
  const [categoryId, setCategoryId] = useState("")
  const [note, setNote] = useState("")
  const [message, setMessage] = useState<string | null>(null)

  const selectedCategories = type === "income" ? incomeCategories : expenseCategories

  const currentCategoryId = categoryId || selectedCategories[0]?.id || ""
  const currentCategory = selectedCategories.find((c) => c.id === currentCategoryId)
  const currentAccount = activeAccounts.find((a) => a.id === accountId)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const num = Number(amount.replace(",", "."))
    if (!Number.isFinite(num) || num <= 0) {
      setMessage("Сумма должна быть больше нуля")
      return
    }

    const result =
      type === "transfer"
        ? createOperation({
            type: "transfer",
            transactionDate: date,
            fromAccountId,
            toAccountId,
            amount: num,
            note: note || undefined,
          })
        : createOperation({
            type,
            transactionDate: date,
            accountId,
            categoryId: currentCategoryId,
            amount: num,
            note: note || undefined,
          })

    if (!result.ok) {
      setMessage(result.error)
      return
    }

    setAmount("")
    setNote("")
    setMessage(null)
  }

  if (activeAccounts.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-4 text-center text-sm text-muted-foreground">
        Добавь счёт в <a href="/settings" className="underline">Настройках</a>, чтобы вносить операции
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-card px-5 py-3.5 ring-1 ring-foreground/5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="mr-1 text-sm font-medium text-muted-foreground whitespace-nowrap">Новая операция:</span>
        {/* Тип */}
        <div className="flex rounded-lg border bg-muted/30 p-0.5">
          {(["income", "expense", "transfer"] as TransactionType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t)
                setCategoryId("")
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
                type === t
                  ? t === "income"
                    ? "bg-emerald-600 text-white"
                    : t === "expense"
                      ? "bg-rose-600 text-white"
                      : "bg-slate-600 text-white dark:bg-slate-500"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "income" ? "Доход" : t === "expense" ? "Расход" : "Перевод"}
            </button>
          ))}
        </div>

        {/* Дата */}
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 w-[140px] text-sm"
        />

        {/* Сумма */}
        <Input
          type="number"
          step="0.01"
          min="0"
          placeholder="Сумма"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-9 w-[120px] text-sm font-semibold"
        />

        {/* Счёт / Перевод */}
        {type === "transfer" ? (
          <>
            <Select value={fromAccountId} onValueChange={(v) => setFromAccountId(v ?? "")}>
              <SelectTrigger className="h-9 w-[130px] text-sm">
                <SelectValue placeholder="Откуда">{findName(activeAccounts, fromAccountId, "Откуда")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", accountCardColorClass(a.color).split(" ")[0]?.replace("border-", "bg-") || "bg-slate-400")} />
                      {a.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">→</span>
            <Select value={toAccountId} onValueChange={(v) => setToAccountId(v ?? "")}>
              <SelectTrigger className="h-9 w-[130px] text-sm">
                <SelectValue placeholder="Куда">{findName(activeAccounts, toAccountId, "Куда")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", accountCardColorClass(a.color).split(" ")[0]?.replace("border-", "bg-") || "bg-slate-400")} />
                      {a.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : (
          <>
            <Select value={accountId} onValueChange={(v) => setAccountId(v ?? "")}>
              <SelectTrigger className="h-9 w-[130px] text-sm">
                <SelectValue placeholder="Счёт">{findName(activeAccounts, accountId, "Счёт")}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {activeAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", `bg-${a.color}-500`)} />
                      {a.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={currentCategoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger className={cn(
                "h-9 w-[140px] text-sm",
                currentCategory && categoryBadgeClass(normalizeCategoryColor(currentCategory.color))
              )}>
                <SelectValue placeholder="Категория">
                  {currentCategory?.name ?? "Категория"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {selectedCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className={cn(
                      "inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs font-medium",
                      categoryBadgeClass(normalizeCategoryColor(c.color))
                    )}>
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {/* Комментарий */}
        <Input
          placeholder="Комментарий"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="h-9 min-w-[120px] flex-1 text-sm"
        />

        {/* Добавить */}
        <Button type="submit" className="h-9 gap-1.5 px-4 text-sm font-semibold">
          <Plus className="h-4 w-4" />
          Добавить
        </Button>
      </div>

      {message && (
        <p className="mt-2 text-sm text-rose-600">{message}</p>
      )}
    </form>
  )
}
