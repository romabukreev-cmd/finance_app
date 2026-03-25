"use client"

import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import { Archive, Download, Pencil, Plus, RotateCcw, Trash2, Upload } from "lucide-react"
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
import { formatMoney, todayIsoDate } from "@/lib/finance/format"
import type { AccountType, CategoryKind } from "@/lib/finance/types"

type AccountFormState = {
  name: string
  type: AccountType
  startBalance: string
  startDate: string
  isArchived: boolean
}

export default function SettingsPage() {
  const {
    accounts,
    categories,
    autoBackups,
    addAccount,
    updateAccount,
    deleteAccount,
    addCategory,
    updateCategory,
    deleteCategory,
    exportBackup,
    importBackup,
    resetAllData,
  } = useFinance()

  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [accountMessage, setAccountMessage] = useState<string | null>(null)
  const [categoryMessage, setCategoryMessage] = useState<string | null>(null)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)

  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [accountForm, setAccountForm] = useState<AccountFormState>({
    name: "",
    type: "asset",
    startBalance: "0",
    startDate: todayIsoDate(),
    isArchived: false,
  })

  const [categoryName, setCategoryName] = useState("")
  const [categoryKind, setCategoryKind] = useState<CategoryKind>("expense")

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState("")
  const [editingCategoryArchived, setEditingCategoryArchived] = useState(false)

  const incomeCategories = useMemo(
    () => categories.filter((category) => category.kind === "income"),
    [categories]
  )

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.kind === "expense"),
    [categories]
  )

  const latestAutoBackupLabel = useMemo(() => {
    if (autoBackups.length === 0) {
      return "Пока нет авто-бэкапов."
    }

    const latestDate = new Date(autoBackups[0].exportedAt)

    if (Number.isNaN(latestDate.getTime())) {
      return "Последний авто-бэкап: неизвестная дата."
    }

    return `Последний авто-бэкап: ${new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(latestDate)}`
  }, [autoBackups])

  const handleDownloadBackup = () => {
    const content = exportBackup()
    const now = new Date()
    const pad = (value: number) => String(value).padStart(2, "0")
    const fileName = `finance-mvp-backup-${now.getFullYear()}${pad(
      now.getMonth() + 1
    )}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`

    const blob = new Blob([content], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    setBackupMessage("Резервная копия скачана.")
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const text = await file.text()
    const result = importBackup(text)
    setBackupMessage(result.ok ? "Данные успешно импортированы." : result.error)

    if (importInputRef.current) {
      importInputRef.current.value = ""
    }
  }

  const handleResetAllData = () => {
    if (
      !window.confirm(
        "Сбросить все данные приложения? Это удалит счета, категории и операции."
      )
    ) {
      return
    }

    resetAllData()
    setAccountMessage(null)
    setCategoryMessage(null)
    setBackupMessage("Все данные сброшены.")
    resetAccountForm()
    setEditingCategoryId(null)
    setEditingCategoryName("")
    setEditingCategoryArchived(false)
  }

  const resetAccountForm = () => {
    setEditingAccountId(null)
    setAccountForm({
      name: "",
      type: "asset",
      startBalance: "0",
      startDate: todayIsoDate(),
      isArchived: false,
    })
  }

  const handleAccountSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const startBalance = Number(accountForm.startBalance.replace(",", "."))

    if (!Number.isFinite(startBalance)) {
      setAccountMessage("Стартовый остаток должен быть числом.")
      return
    }

    const result =
      editingAccountId !== null
        ? updateAccount({
            id: editingAccountId,
            name: accountForm.name,
            type: accountForm.type,
            startBalance,
            startDate: accountForm.startDate,
            isArchived: accountForm.isArchived,
          })
        : addAccount({
            name: accountForm.name,
            type: accountForm.type,
            startBalance,
            startDate: accountForm.startDate,
          })

    if (!result.ok) {
      setAccountMessage(result.error)
      return
    }

    setAccountMessage(editingAccountId ? "Счет обновлен." : "Счет добавлен.")
    resetAccountForm()
  }

  const startAccountEdit = (accountId: string) => {
    const account = accounts.find((item) => item.id === accountId)

    if (!account) {
      return
    }

    setEditingAccountId(account.id)
    setAccountForm({
      name: account.name,
      type: account.type,
      startBalance: String(Math.abs(account.startBalance)),
      startDate: account.startDate,
      isArchived: account.isArchived,
    })
    setAccountMessage(null)
  }

  const handleDeleteAccount = (accountId: string) => {
    if (!window.confirm("Удалить счет?")) {
      return
    }

    const result = deleteAccount(accountId)
    setAccountMessage(result.ok ? "Счет удален." : result.error)

    if (result.ok && editingAccountId === accountId) {
      resetAccountForm()
    }
  }

  const handleAddCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const result = addCategory({ name: categoryName, kind: categoryKind })

    if (!result.ok) {
      setCategoryMessage(result.error)
      return
    }

    setCategoryName("")
    setCategoryMessage("Категория добавлена.")
  }

  const startCategoryEdit = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId)

    if (!category || category.isSystem) {
      return
    }

    setEditingCategoryId(category.id)
    setEditingCategoryName(category.name)
    setEditingCategoryArchived(category.isArchived)
    setCategoryMessage(null)
  }

  const handleSaveCategory = () => {
    if (!editingCategoryId) {
      return
    }

    const result = updateCategory({
      id: editingCategoryId,
      name: editingCategoryName,
      isArchived: editingCategoryArchived,
    })

    if (!result.ok) {
      setCategoryMessage(result.error)
      return
    }

    setCategoryMessage("Категория обновлена.")
    setEditingCategoryId(null)
    setEditingCategoryName("")
    setEditingCategoryArchived(false)
  }

  const handleDeleteCategory = (categoryId: string) => {
    if (!window.confirm("Удалить категорию? Операции будут переведены в «Прочее».")) {
      return
    }

    const result = deleteCategory(categoryId)
    setCategoryMessage(result.ok ? "Категория удалена." : result.error)

    if (result.ok && editingCategoryId === categoryId) {
      setEditingCategoryId(null)
      setEditingCategoryName("")
      setEditingCategoryArchived(false)
    }
  }

  const renderCategoryBlock = (kind: CategoryKind, items: typeof categories) => (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">
        {kind === "income" ? "Категории доходов" : "Категории расходов"}
      </h3>
      {items.map((category) => (
        <div key={category.id} className="rounded-lg border p-3">
          {editingCategoryId === category.id ? (
            <div className="space-y-2">
              <Input
                value={editingCategoryName}
                onChange={(event) => setEditingCategoryName(event.target.value)}
              />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={editingCategoryArchived}
                  onChange={(event) => setEditingCategoryArchived(event.target.checked)}
                />
                В архиве
              </label>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveCategory}>
                  Сохранить
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingCategoryId(null)}
                >
                  Отмена
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="font-medium">{category.name}</p>
                {category.isSystem ? <Badge>Системная</Badge> : null}
                {category.isArchived ? <Badge variant="secondary">Архив</Badge> : null}
              </div>

              {!category.isSystem ? (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => startCategoryEdit(category.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Настройки"
        description="Управление счетами и категориями для операций."
      />

      <Card>
        <CardHeader>
          <CardTitle>Резервная копия и восстановление</CardTitle>
          <CardDescription>
            Экспортируй данные в JSON перед изменениями. Импорт заменяет текущее
            состояние приложения.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            <p>Авто-бэкапы: {autoBackups.length} из 3.</p>
            <p>{latestAutoBackupLabel}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="gap-2" onClick={handleDownloadBackup}>
              <Download className="h-4 w-4" />
              Скачать JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => importInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Импорт JSON
            </Button>
            <Button type="button" variant="destructive" className="gap-2" onClick={handleResetAllData}>
              <RotateCcw className="h-4 w-4" />
              Сбросить всё
            </Button>
          </div>

          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />

          {backupMessage ? <p className="text-sm text-muted-foreground">{backupMessage}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingAccountId ? "Редактировать счет" : "Добавить счет"}</CardTitle>
          <CardDescription>
            Для долга введенная сумма автоматически сохранится как отрицательная.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-5" onSubmit={handleAccountSubmit}>
            <Input
              placeholder="Название"
              value={accountForm.name}
              onChange={(event) =>
                setAccountForm((previous) => ({ ...previous, name: event.target.value }))
              }
            />

            <Select
              value={accountForm.type}
              onValueChange={(value) =>
                setAccountForm((previous) => ({
                  ...previous,
                  type: (value ?? "asset") as AccountType,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asset">Актив</SelectItem>
                <SelectItem value="debt">Долг</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Стартовый остаток"
              value={accountForm.startBalance}
              onChange={(event) =>
                setAccountForm((previous) => ({ ...previous, startBalance: event.target.value }))
              }
            />

            <Input
              type="date"
              value={accountForm.startDate}
              onChange={(event) =>
                setAccountForm((previous) => ({ ...previous, startDate: event.target.value }))
              }
            />

            <Button type="submit" className="gap-2">
              <Plus className="h-4 w-4" />
              {editingAccountId ? "Сохранить" : "Добавить"}
            </Button>
          </form>

          {editingAccountId ? (
            <div className="mt-2 flex items-center justify-between rounded-md border p-2 text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={accountForm.isArchived}
                  onChange={(event) =>
                    setAccountForm((previous) => ({ ...previous, isArchived: event.target.checked }))
                  }
                />
                <Archive className="h-4 w-4" />
                Счет в архиве
              </label>
              <Button variant="outline" size="sm" onClick={resetAccountForm}>
                Отмена
              </Button>
            </div>
          ) : null}

          {accountMessage ? (
            <p className="mt-3 text-sm text-muted-foreground">{accountMessage}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Счета</CardTitle>
          <CardDescription>
            Удаление счета возможно только если к нему нет привязанных операций.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Старт</TableHead>
                <TableHead>Дата старта</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Пока нет счетов.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{account.type === "debt" ? "Долг" : "Актив"}</Badge>
                      {account.isArchived ? <Badge className="ml-2" variant="secondary">Архив</Badge> : null}
                    </TableCell>
                    <TableCell>{formatMoney(account.startBalance)}</TableCell>
                    <TableCell>{account.startDate}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => startAccountEdit(account.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteAccount(account.id)}>
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

      <Card>
        <CardHeader>
          <CardTitle>Категории</CardTitle>
          <CardDescription>
            При удалении обычной категории все операции автоматически переходят в «Прочее».
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-4" onSubmit={handleAddCategory}>
            <Input
              placeholder="Название категории"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
            />

            <Select
              value={categoryKind}
              onValueChange={(value) =>
                setCategoryKind((value ?? "expense") as CategoryKind)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Тип категории" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Расход</SelectItem>
                <SelectItem value="income">Доход</SelectItem>
              </SelectContent>
            </Select>

            <Button type="submit" className="gap-2 md:col-span-2">
              <Plus className="h-4 w-4" />
              Добавить категорию
            </Button>
          </form>

          {categoryMessage ? <p className="text-sm text-muted-foreground">{categoryMessage}</p> : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {renderCategoryBlock("expense", expenseCategories)}
            {renderCategoryBlock("income", incomeCategories)}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
