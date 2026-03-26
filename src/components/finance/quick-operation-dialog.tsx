"use client"

import { useMemo, useState, type FormEvent } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFinance } from "@/components/finance/finance-provider"
import { buildOperationForm, findName, type OperationFormState } from "@/lib/finance/helpers"
import type { TransactionType } from "@/lib/finance/types"

type QuickOperationDialogProps = {
  open: boolean
  type: TransactionType
  onOpenChange: (open: boolean) => void
}

function dialogTitle(type: TransactionType) {
  if (type === "income") {
    return "Новый доход"
  }

  if (type === "expense") {
    return "Новый расход"
  }

  return "Новый перевод"
}

export function QuickOperationDialog({
  open,
  type,
  onOpenChange,
}: QuickOperationDialogProps) {
  const { accounts, categories, createOperation } = useFinance()

  const activeAccounts = useMemo(
    () => accounts.filter((account) => !account.isArchived),
    [accounts]
  )

  const incomeCategories = useMemo(
    () => categories.filter((category) => category.kind === "income" && !category.isArchived),
    [categories]
  )

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.kind === "expense" && !category.isArchived),
    [categories]
  )

  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState<OperationFormState>(() =>
    buildOperationForm(type, activeAccounts, incomeCategories, expenseCategories)
  )

  const selectedCategories = type === "income" ? incomeCategories : expenseCategories

  const submitDisabled =
    activeAccounts.length === 0 ||
    (type === "transfer" ? activeAccounts.length < 2 : selectedCategories.length === 0)

  const accountLabelById = (id: string) => findName(activeAccounts, id, "Счет")
  const categoryLabelById = (id: string) => findName(selectedCategories, id, "Категория")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const amount = Number(form.amount.replace(",", "."))

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Сумма должна быть больше нуля.")
      return
    }

    if (submitDisabled) {
      setMessage("Для этой операции сначала добавь нужные счета и категории.")
      return
    }

    const result =
      type === "transfer"
        ? createOperation({
            type: "transfer",
            transactionDate: form.transactionDate,
            fromAccountId: form.fromAccountId,
            toAccountId: form.toAccountId,
            amount,
            note: form.note,
          })
        : createOperation({
            type,
            transactionDate: form.transactionDate,
            accountId: form.accountId,
            categoryId: form.categoryId,
            amount,
            note: form.note,
          })

    if (!result.ok) {
      setMessage(result.error)
      return
    }

    onOpenChange(false)
    setMessage(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle(type)}</DialogTitle>
          <DialogDescription>
            Сумма вводится положительной, знак проставляется автоматически.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
          <Input
            type="date"
            value={form.transactionDate}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                transactionDate: event.target.value,
              }))
            }
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="Сумма"
            value={form.amount}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, amount: event.target.value }))
            }
          />

          {type === "transfer" ? (
            <>
              <Select
                value={form.fromAccountId}
                onValueChange={(value) =>
                  setForm((previous) => ({ ...previous, fromAccountId: value ?? "" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Счет списания">
                    {accountLabelById(form.fromAccountId)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={form.toAccountId}
                onValueChange={(value) =>
                  setForm((previous) => ({ ...previous, toAccountId: value ?? "" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Счет зачисления">
                    {accountLabelById(form.toAccountId)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <>
              <Select
                value={form.accountId}
                onValueChange={(value) =>
                  setForm((previous) => ({ ...previous, accountId: value ?? "" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Счет">
                    {accountLabelById(form.accountId)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activeAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={form.categoryId}
                onValueChange={(value) =>
                  setForm((previous) => ({ ...previous, categoryId: value ?? "" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Категория">
                    {categoryLabelById(form.categoryId)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {selectedCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          <Input
            className="sm:col-span-2"
            placeholder="Комментарий (опционально)"
            value={form.note}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, note: event.target.value }))
            }
          />

          {submitDisabled ? (
            <p className="sm:col-span-2 text-sm text-muted-foreground">
              {activeAccounts.length === 0
                ? "Нет активных счетов. Добавь счет в разделе «Настройки»."
                : type === "transfer"
                  ? "Для перевода нужно минимум два активных счета."
                  : "Нет доступных категорий для этого типа операции."}
            </p>
          ) : null}

          {message ? <p className="sm:col-span-2 text-sm text-muted-foreground">{message}</p> : null}

          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={submitDisabled}>
              Сохранить
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
