"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
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
  todayIsoDate,
  transactionTypeLabel,
} from "@/lib/finance/format"
import type { TransactionType } from "@/lib/finance/types"

type FormState = {
  transactionDate: string
  amount: string
  accountId: string
  categoryId: string
  fromAccountId: string
  toAccountId: string
  note: string
}

const TYPE_OPTIONS: Array<{ value: TransactionType; label: string }> = [
  { value: "income", label: "Доход" },
  { value: "expense", label: "Расход" },
  { value: "transfer", label: "Перевод" },
]

export default function TransactionsPage() {
  const {
    accounts,
    categories,
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

  const defaultAccountId = activeAccounts[0]?.id ?? ""

  const defaultCategoryId = (type: TransactionType) => {
    if (type === "income") {
      return incomeCategories[0]?.id ?? ""
    }

    if (type === "expense") {
      return expenseCategories[0]?.id ?? ""
    }

    return ""
  }

  const buildInitialForm = (type: TransactionType): FormState => ({
    transactionDate: todayIsoDate(),
    amount: "",
    accountId: defaultAccountId,
    categoryId: defaultCategoryId(type),
    fromAccountId: defaultAccountId,
    toAccountId: activeAccounts[1]?.id ?? defaultAccountId,
    note: "",
  })

  const [selectedMonth, setSelectedMonth] = useState(currentMonth())
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all")
  const [accountFilter, setAccountFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [formType, setFormType] = useState<TransactionType>("expense")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTransferId, setEditingTransferId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(buildInitialForm("expense"))

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

  const accountNameById = (accountId: string | null) =>
    accounts.find((account) => account.id === accountId)?.name ?? "—"

  const categoryNameById = (categoryId: string | null) =>
    categories.find((category) => category.id === categoryId)?.name ?? "—"

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

    setFormType(operation.type)
    setEditingTransferId(null)
    setEditingId(operation.id)
    setForm({
      transactionDate: operation.transactionDate,
      amount: String(operation.amount),
      accountId: operation.accountId ?? "",
      categoryId: operation.categoryId ?? defaultCategoryId(operation.type),
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
        : deleteOperation({ type: operation.type as "income" | "expense", id })

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
    setForm((previous) => ({
      ...previous,
      categoryId: defaultCategoryId(nextType),
    }))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Операции"
        description="Добавление, редактирование, удаление и фильтрация операций по месяцу."
        actions={
          formMode === "edit" ? (
            <Button variant="outline" onClick={resetForm}>
              Сбросить редактирование
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{formMode === "edit" ? "Редактировать" : "Новая операция"}</CardTitle>
          <CardDescription>
            Сумма вводится всегда положительной. Знак ставится автоматически по типу.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 lg:grid-cols-6" onSubmit={handleSubmit}>
            <div className="lg:col-span-2">
              <Select
                value={formType}
                onValueChange={(value) =>
                  value ? handleTypeChange(value as TransactionType) : undefined
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Тип операции" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
              placeholder="Сумма"
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
                  <SelectTrigger>
                    <SelectValue placeholder="Счет списания" />
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
                  <SelectTrigger>
                    <SelectValue placeholder="Счет зачисления" />
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
                  <SelectTrigger>
                    <SelectValue placeholder="Счет" />
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
                  <SelectTrigger>
                    <SelectValue placeholder="Категория" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formType === "income" ? incomeCategories : expenseCategories).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            <Input
              className="lg:col-span-4"
              placeholder="Комментарий (опционально)"
              value={form.note}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, note: event.target.value }))
              }
            />

            <Button type="submit" className="lg:col-span-2 gap-2">
              <Plus className="h-4 w-4" />
              {formMode === "edit" ? "Сохранить" : "Добавить"}
            </Button>
          </form>

          {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
          <CardDescription>Помесячный просмотр операций и быстрый поиск.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />

          <Select
            value={typeFilter}
            onValueChange={(value) =>
              setTypeFilter((value ?? "all") as "all" | TransactionType)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Тип" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="income">Доход</SelectItem>
              <SelectItem value="expense">Расход</SelectItem>
              <SelectItem value="transfer">Перевод</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={accountFilter}
            onValueChange={(value) => setAccountFilter(value ?? "all")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Счет" />
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
            <SelectTrigger>
              <SelectValue placeholder="Категория" />
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
                      <Badge
                        variant={
                          operation.type === "income"
                            ? "outline"
                            : operation.type === "expense"
                              ? "secondary"
                              : "default"
                        }
                      >
                        {transactionTypeLabel(operation.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {operation.type === "transfer"
                        ? `${accountNameById(operation.fromAccountId)} → ${accountNameById(operation.toAccountId)}`
                        : accountNameById(operation.accountId)}
                    </TableCell>
                    <TableCell>
                      {operation.type === "transfer" ? "—" : categoryNameById(operation.categoryId)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {operation.type === "expense"
                        ? `−${formatMoney(operation.amount)}`
                        : operation.type === "income"
                          ? `+${formatMoney(operation.amount)}`
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
