"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react"
import { useFinance } from "@/components/finance/finance-provider"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  currentMonth,
  formatMoney,
  monthKey,
  transactionTypeLabel,
} from "@/lib/finance/format"
import { categoryBadgeClass, normalizeCategoryColor } from "@/lib/finance/category-colors"
import type { TransactionType } from "@/lib/finance/types"
import { buildOperationForm, defaultCategoryId, findName, type OperationFormState } from "@/lib/finance/helpers"
import { cn } from "@/lib/utils"

const TYPE_OPTIONS: Array<{ value: TransactionType; label: string }> = [
  { value: "income", label: "Доход" },
  { value: "expense", label: "Расход" },
  { value: "transfer", label: "Перевод" },
  { value: "adjustment", label: "Корректировка" },
]

function getTypeLabel(value: TransactionType | "all") {
  if (value === "all") {
    return "Все типы"
  }

  return TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function typeBadgeClass(type: TransactionType) {
  if (type === "income") {
    return "border-emerald-400 bg-white text-emerald-700 dark:border-emerald-700 dark:bg-transparent dark:text-emerald-300"
  }

  if (type === "expense") {
    return "border-rose-400 bg-white text-rose-700 dark:border-rose-700 dark:bg-transparent dark:text-rose-300"
  }

  if (type === "adjustment") {
    return "border-amber-400 bg-white text-amber-700 dark:border-amber-600 dark:bg-transparent dark:text-amber-300"
  }

  return "border-border bg-muted text-foreground dark:bg-muted/40 dark:text-foreground"
}

export default function TransactionsPage() {
  const {
    accounts,
    categories,
    balances,
    transactions,
    displayTransactions,
    createOperation,
    updateOperation,
    deleteOperation,
  } = useFinance()

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

  const buildInitialForm = (type: TransactionType): OperationFormState =>
    buildOperationForm(type, activeAccounts, incomeCategories, expenseCategories)

  const [selectedMonth, setSelectedMonth] = useState(currentMonth())
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all")
  const [accountFilter, setAccountFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [formType, setFormType] = useState<TransactionType>("expense")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTransferId, setEditingTransferId] = useState<string | null>(null)
  const [editingOldSignedAmount, setEditingOldSignedAmount] = useState<number>(0)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState<OperationFormState>(buildInitialForm("expense"))

  const filteredOperations = useMemo(() => {
    return displayTransactions.filter((operation) => {
      if (monthKey(operation.transactionDate) !== selectedMonth) {
        return false
      }

      if (typeFilter !== "all" && operation.type !== typeFilter) {
        return false
      }

      if (accountFilter !== "all") {
        if (operation.type === "transfer") {
          return (
            operation.fromAccountId === accountFilter ||
            operation.toAccountId === accountFilter ||
            operation.accountId === accountFilter
          )
        }

        return operation.accountId === accountFilter
      }

      if (categoryFilter !== "all") {
        if (operation.type === "transfer") {
          return false
        }

        return operation.categoryId === categoryFilter
      }

      return true
    })
  }, [accountFilter, categoryFilter, displayTransactions, selectedMonth, typeFilter])

  const accountNameById = (id: string | null) => findName(accounts, id)
  const categoryNameById = (id: string | null) => findName(categories, id)
  const categoryById = (id: string | null) =>
    categories.find((category) => category.id === id)

  const accountFilterLabel =
    accountFilter === "all" ? "Все счета" : accountNameById(accountFilter)
  const categoryFilterLabel =
    categoryFilter === "all" ? "Все категории" : categoryNameById(categoryFilter)

  const resetForm = () => {
    setFormMode("create")
    setEditingId(null)
    setEditingTransferId(null)
    setMessage(null)
    setFormType("expense")
    setForm(buildInitialForm("expense"))
  }

  const startEdit = (id: string) => {
    const operation = filteredOperations.find((item) => item.id === id)

    if (!operation) {
      return
    }

    setFormMode("edit")
    setMessage(null)

    if (operation.type === "transfer" && operation.transferId) {
      setFormType("transfer")
      setEditingTransferId(operation.transferId)
      setEditingId(null)
      setEditingOldSignedAmount(0)
      setForm({
        transactionDate: operation.transactionDate,
        amount: String(operation.amount),
        accountId: "",
        categoryId: "",
        fromAccountId: operation.fromAccountId ?? "",
        toAccountId: operation.toAccountId ?? "",
        note: operation.note ?? "",
      })
      return
    }

    if (operation.type === "adjustment") {
      const rawTx = transactions.find((t) => t.id === operation.id)
      const oldSignedAmount = rawTx?.signedAmount ?? 0
      const currentBalance = balances.find((b) => b.account.id === operation.accountId)?.balance ?? 0
      setFormType("adjustment")
      setEditingTransferId(null)
      setEditingId(operation.id)
      setEditingOldSignedAmount(oldSignedAmount)
      setForm({
        transactionDate: operation.transactionDate,
        amount: String(currentBalance),
        accountId: operation.accountId ?? "",
        categoryId: "",
        fromAccountId: "",
        toAccountId: "",
        note: operation.note ?? "",
      })
      return
    }

    setFormType(operation.type)
    setEditingTransferId(null)
    setEditingId(operation.id)
    setEditingOldSignedAmount(0)
    setForm({
      transactionDate: operation.transactionDate,
      amount: String(operation.amount),
      accountId: operation.accountId ?? "",
      categoryId: operation.categoryId ?? defaultCategoryId(operation.type, incomeCategories, expenseCategories),
      fromAccountId: "",
      toAccountId: "",
      note: operation.note ?? "",
    })
  }

  const handleDelete = (id: string) => {
    const operation = filteredOperations.find((item) => item.id === id)

    if (!operation) {
      return
    }

    if (!window.confirm("Удалить операцию?")) {
      return
    }

    const result =
      operation.type === "transfer" && operation.transferId
        ? deleteOperation({ type: "transfer", transferId: operation.transferId })
        : deleteOperation({ type: operation.type as "income" | "expense" | "adjustment", id })

    setMessage(result.ok ? "Операция удалена." : result.error)

    if (result.ok && formMode === "edit" && id === editingId) {
      resetForm()
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const amount = Number(form.amount.replace(",", "."))

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Сумма должна быть больше нуля.")
      return
    }

    if (activeAccounts.length === 0) {
      setMessage("Сначала добавь счет в разделе «Настройки».")
      return
    }

    if (formType === "transfer") {
      const result =
        formMode === "edit" && editingTransferId
          ? updateOperation({
              type: "transfer",
              transferId: editingTransferId,
              transactionDate: form.transactionDate,
              fromAccountId: form.fromAccountId,
              toAccountId: form.toAccountId,
              amount,
              note: form.note,
            })
          : createOperation({
              type: "transfer",
              transactionDate: form.transactionDate,
              fromAccountId: form.fromAccountId,
              toAccountId: form.toAccountId,
              amount,
              note: form.note,
            })

      if (!result.ok) {
        setMessage(result.error)
        return
      }

      setMessage(formMode === "edit" ? "Перевод обновлен." : "Перевод добавлен.")
      resetForm()
      return
    }

    if (formType === "adjustment") {
      const targetBalance = Number(form.amount.replace(",", "."))

      if (!Number.isFinite(targetBalance)) {
        setMessage("Введи корректный фактический баланс.")
        return
      }

      const currentBalance = balances.find((b) => b.account.id === form.accountId)?.balance ?? 0
      const baseBalance = formMode === "edit" ? currentBalance - editingOldSignedAmount : currentBalance
      const signedAmount = Math.round((targetBalance - baseBalance) * 100) / 100

      if (signedAmount === 0) {
        setMessage("Фактический баланс совпадает с текущим — корректировка не нужна.")
        return
      }

      const result =
        formMode === "edit" && editingId
          ? updateOperation({
              type: "adjustment",
              id: editingId,
              transactionDate: form.transactionDate,
              accountId: form.accountId,
              signedAmount,
              note: form.note,
            })
          : createOperation({
              type: "adjustment",
              transactionDate: form.transactionDate,
              accountId: form.accountId,
              signedAmount,
              note: form.note,
            })

      if (!result.ok) {
        setMessage(result.error)
        return
      }

      setMessage(formMode === "edit" ? "Корректировка обновлена." : "Корректировка добавлена.")
      resetForm()
      return
    }

    const result =
      formMode === "edit" && editingId
        ? updateOperation({
            type: formType,
            id: editingId,
            transactionDate: form.transactionDate,
            accountId: form.accountId,
            categoryId: form.categoryId,
            amount,
            note: form.note,
          })
        : createOperation({
            type: formType,
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

    setMessage(formMode === "edit" ? "Операция обновлена." : "Операция добавлена.")
    resetForm()
  }

  const handleTypeChange = (nextType: TransactionType) => {
    if (formMode === "edit") {
      return
    }

    setFormType(nextType)
    setEditingOldSignedAmount(0)
    setForm((previous) => ({
      ...previous,
      amount: "",
      categoryId: defaultCategoryId(nextType, incomeCategories, expenseCategories),
    }))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Операции"
        description="Просмотр, редактирование и фильтрация операций по месяцу."
      />
      <Card>
        <CardContent className="grid gap-3 md:grid-cols-4 pt-6">
            <Input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />

            <Select
              value={typeFilter}
              onValueChange={(value) =>
                setTypeFilter((value ?? "all") as "all" | TransactionType)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Тип">
                  {getTypeLabel(typeFilter)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="income">Доход</SelectItem>
                <SelectItem value="expense">Расход</SelectItem>
                <SelectItem value="transfer">Перевод</SelectItem>
                <SelectItem value="adjustment">Корректировка</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={accountFilter}
              onValueChange={(value) => setAccountFilter(value ?? "all")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Счет">{accountFilterLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все счета</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={categoryFilter}
              onValueChange={(value) => setCategoryFilter(value ?? "all")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Категория">{categoryFilterLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
      </Card>

      {formMode === "edit" ? (
        <Card>
          <CardHeader>
            <CardTitle>Редактирование операции</CardTitle>
            <CardDescription>{transactionTypeLabel(formType)}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
              <Input
                type="date"
                value={form.transactionDate}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, transactionDate: event.target.value }))
                }
              />
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={formType === "adjustment" ? "Фактический баланс" : "Сумма"}
                value={form.amount}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, amount: event.target.value }))
                }
              />

              {formType === "transfer" ? (
                <>
                  <Select
                    value={form.fromAccountId}
                    onValueChange={(value) =>
                      setForm((previous) => ({ ...previous, fromAccountId: value ?? "" }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Счет списания">
                        {findName(activeAccounts, form.fromAccountId, "Счет списания")}
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
                        {findName(activeAccounts, form.toAccountId, "Счет зачисления")}
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
                        {findName(activeAccounts, form.accountId, "Счет")}
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

                  {formType !== "adjustment" ? (
                    <Select
                      value={form.categoryId}
                      onValueChange={(value) =>
                        setForm((previous) => ({ ...previous, categoryId: value ?? "" }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Категория">
                          {findName(
                            formType === "income" ? incomeCategories : expenseCategories,
                            form.categoryId,
                            "Категория"
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(formType === "income" ? incomeCategories : expenseCategories).map(
                          (category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  ) : null}
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

              {message ? (
                <p className="sm:col-span-2 text-sm text-muted-foreground">{message}</p>
              ) : null}

              <div className="sm:col-span-2 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Отмена
                </Button>
                <Button type="submit">Сохранить</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Список операций</CardTitle>
          <CardDescription>
            Перевод хранится как две ноги, но отображается одной строкой.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Счет</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead>Комментарий</TableHead>
                <TableHead className="w-[120px] text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOperations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Нет операций по выбранным фильтрам.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOperations.map((operation) => (
                  <TableRow key={operation.id}>
                    <TableCell>{operation.transactionDate}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={typeBadgeClass(operation.type)}>
                        {transactionTypeLabel(operation.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {operation.type === "transfer"
                        ? `${accountNameById(operation.fromAccountId)} → ${accountNameById(operation.toAccountId)}`
                        : accountNameById(operation.accountId)}
                    </TableCell>
                    <TableCell>
                      {operation.type === "transfer" || operation.type === "adjustment" ? (
                        "—"
                      ) : (
                        <Badge
                          variant="outline"
                          className={categoryBadgeClass(
                            normalizeCategoryColor(categoryById(operation.categoryId)?.color)
                          )}
                        >
                          {categoryNameById(operation.categoryId)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        operation.type === "income"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "",
                        operation.type === "expense" ? "text-rose-600 dark:text-rose-400" : "",
                        operation.type === "adjustment"
                          ? transactions.find((t) => t.id === operation.id)?.signedAmount ?? 0 >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                          : ""
                      )}
                    >
                      {operation.type === "expense"
                        ? `−${formatMoney(operation.amount)}`
                        : operation.type === "income"
                          ? `+${formatMoney(operation.amount)}`
                          : operation.type === "adjustment"
                            ? (() => {
                                const signed = transactions.find((t) => t.id === operation.id)?.signedAmount ?? 0
                                return signed >= 0 ? `+${formatMoney(signed)}` : `−${formatMoney(Math.abs(signed))}`
                              })()
                            : formatMoney(operation.amount)}
                    </TableCell>
                    <TableCell>{operation.note ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(operation.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(operation.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
