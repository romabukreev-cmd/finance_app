"use client"

import { useMemo, useState } from "react"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowUpDown,
  PiggyBank,
  TrendingUp,
} from "lucide-react"
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts"
import { useFinance } from "@/components/finance/finance-provider"
import { QuickInputBar } from "@/components/finance/quick-input-bar"
import { QuickOperationDialog } from "@/components/finance/quick-operation-dialog"
import { PageHeader } from "@/components/layout/page-header"
import { accountCardColorClass } from "@/lib/finance/account-colors"
import { categoryColorHex, normalizeCategoryColor } from "@/lib/finance/category-colors"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import {
  accountTypeLabel,
  currentMonth,
  formatMoney,
  monthKey,
  transactionTypeLabel,
} from "@/lib/finance/format"
import type { TransactionType } from "@/lib/finance/types"
import { cn } from "@/lib/utils"

const incomeExpenseConfig = {
  income: {
    label: "Доход",
    color: "#16a34a",
  },
  expense: {
    label: "Расход",
    color: "#e11d48",
  },
} satisfies ChartConfig

const expensePieConfig = {
  value: {
    label: "Расходы",
    color: "#0f172a",
  },
} satisfies ChartConfig

const incomePieConfig = {
  value: {
    label: "Доходы",
    color: "#0f172a",
  },
} satisfies ChartConfig

const netWorthConfig = {
  netWorth: {
    label: "Капитализация",
    color: "#0ea5e9",
  },
} satisfies ChartConfig

function PieSliceTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      <p className="font-semibold text-foreground">{payload[0].name}</p>
      <p className="text-sm text-muted-foreground">{formatMoney(Number(payload[0].value))}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { hydrated, accounts, balances, categories, displayTransactions, netWorth, transactions } =
    useFinance()

  const [selectedMonth, setSelectedMonth] = useState(currentMonth())
  const [quickDialogOpen, setQuickDialogOpen] = useState(false)
  const [quickType, setQuickType] = useState<TransactionType>("income")

  const openQuickDialog = (type: TransactionType) => {
    setQuickType(type)
    setQuickDialogOpen(true)
  }

  const monthTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) => monthKey(transaction.transactionDate) === selectedMonth
      ),
    [selectedMonth, transactions]
  )

  const incomeTotal = useMemo(
    () =>
      monthTransactions
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + transaction.signedAmount, 0),
    [monthTransactions]
  )

  const expenseTotal = useMemo(
    () =>
      Math.abs(
        monthTransactions
          .filter((transaction) => transaction.type === "expense")
          .reduce((sum, transaction) => sum + transaction.signedAmount, 0)
      ),
    [monthTransactions]
  )

  const diff = incomeTotal - expenseTotal

  const incomeExpenseSeries = useMemo(() => {
    const relevant = transactions.filter(
      (t) => t.type === "income" || t.type === "expense"
    )
    if (relevant.length === 0) return []

    const firstDate = relevant.reduce(
      (min, t) => (t.transactionDate < min ? t.transactionDate : min),
      relevant[0].transactionDate
    )
    const today = new Date().toISOString().slice(0, 10)

    const dailyIncome = new Map<string, number>()
    const dailyExpense = new Map<string, number>()
    for (const t of relevant) {
      if (t.type === "income")
        dailyIncome.set(t.transactionDate, (dailyIncome.get(t.transactionDate) ?? 0) + t.amount)
      else
        dailyExpense.set(t.transactionDate, (dailyExpense.get(t.transactionDate) ?? 0) + t.amount)
    }

    const points: { date: string; label: string; income: number; expense: number }[] = []
    const cursor = new Date(firstDate)
    const end = new Date(today)
    let cumIncome = 0
    let cumExpense = 0

    while (cursor <= end) {
      const d = cursor.toISOString().slice(0, 10)
      cumIncome += dailyIncome.get(d) ?? 0
      cumExpense += dailyExpense.get(d) ?? 0
      points.push({ date: d, label: `${d.slice(8)}.${d.slice(5, 7)}`, income: cumIncome, expense: cumExpense })
      cursor.setDate(cursor.getDate() + 1)
    }

    return points
  }, [transactions])

  const netWorthSeries = useMemo(() => {
    if (transactions.length === 0) return []

    const firstDate = transactions.reduce(
      (min, t) => (t.transactionDate < min ? t.transactionDate : min),
      transactions[0].transactionDate
    )
    const today = new Date().toISOString().slice(0, 10)

    const dailyDelta = new Map<string, number>()
    for (const t of transactions) {
      dailyDelta.set(t.transactionDate, (dailyDelta.get(t.transactionDate) ?? 0) + t.signedAmount)
    }

    const base = accounts.reduce((sum, a) => sum + a.startBalance, 0)
    const points: { date: string; label: string; netWorth: number }[] = []
    const cursor = new Date(firstDate)
    const end = new Date(today)
    let rolling = base

    while (cursor <= end) {
      const d = cursor.toISOString().slice(0, 10)
      rolling += dailyDelta.get(d) ?? 0
      points.push({ date: d, label: `${d.slice(8)}.${d.slice(5, 7)}`, netWorth: rolling })
      cursor.setDate(cursor.getDate() + 1)
    }

    return points
  }, [accounts, transactions])

  const expenseRows = useMemo(
    () =>
      Object.entries(
        monthTransactions
          .filter((transaction) => transaction.type === "expense" && transaction.categoryId)
          .reduce<Record<string, number>>((acc, transaction) => {
            const categoryId = transaction.categoryId as string
            acc[categoryId] = (acc[categoryId] ?? 0) + transaction.amount
            return acc
          }, {})
      )
        .map(([categoryId, value]) => {
          const category = categories.find((item) => item.id === categoryId)
          const color = categoryColorHex(normalizeCategoryColor(category?.color))
          return { categoryId, name: category?.name ?? "Прочее", value, fill: color }
        })
        .sort((left, right) => right.value - left.value),
    [categories, monthTransactions]
  )

  const incomeRows = useMemo(
    () =>
      Object.entries(
        monthTransactions
          .filter((transaction) => transaction.type === "income" && transaction.categoryId)
          .reduce<Record<string, number>>((acc, transaction) => {
            const categoryId = transaction.categoryId as string
            acc[categoryId] = (acc[categoryId] ?? 0) + transaction.amount
            return acc
          }, {})
      )
        .map(([categoryId, value]) => {
          const category = categories.find((item) => item.id === categoryId)
          const color = categoryColorHex(normalizeCategoryColor(category?.color))
          return { categoryId, name: category?.name ?? "Прочее", value, fill: color }
        })
        .sort((left, right) => right.value - left.value),
    [categories, monthTransactions]
  )

  const recentOperations = useMemo(
    () =>
      displayTransactions
        .filter((operation) => monthKey(operation.transactionDate) === selectedMonth)
        .slice(0, 6),
    [displayTransactions, selectedMonth]
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Дашборд"
        description=""
        actions={
          <Input
            className="h-10 w-[180px] text-sm font-semibold"
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />
        }
      />

      <QuickInputBar />

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-3">
          <Card>
            <CardHeader>
              <CardDescription>Капитализация</CardDescription>
              <CardTitle className="text-2xl md:text-3xl">{formatMoney(netWorth)}</CardTitle>
            </CardHeader>
            <CardFooter className="text-xs text-muted-foreground">
              Сумма балансов активов и долгов
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Доход за месяц</CardDescription>
              <CardTitle className="text-2xl text-emerald-600 md:text-3xl">
                {formatMoney(incomeTotal)}
              </CardTitle>
            </CardHeader>
            <CardFooter className="text-xs text-muted-foreground">
              Только операции типа «Доход»
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Расход за месяц</CardDescription>
              <CardTitle className="text-2xl text-rose-600 md:text-3xl">
                {formatMoney(expenseTotal)}
              </CardTitle>
            </CardHeader>
            <CardFooter className="text-xs text-muted-foreground">
              Только операции типа «Расход»
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Разница месяца</CardDescription>
              <CardTitle
                className={cn(
                  "text-2xl md:text-3xl",
                  diff >= 0 ? "text-emerald-600" : "text-rose-600"
                )}
              >
                {formatMoney(diff)}
              </CardTitle>
            </CardHeader>
            <CardFooter className="text-xs text-muted-foreground">
              Доход минус расход
            </CardFooter>
          </Card>
        </div>

        <div className="flex flex-col gap-4 xl:col-span-6">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Динамика доходов и расходов</CardTitle>
              <CardDescription>
                Накопительный итог по всем дням. Переводы не учитываются.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={incomeExpenseConfig}
                className="h-[180px] w-full aspect-auto"
              >
                <LineChart data={incomeExpenseSeries} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} interval={Math.max(0, Math.floor(incomeExpenseSeries.length / 6) - 1)} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={4} width={50} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}к` : String(v)} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <>
                            <span className="text-muted-foreground">
                              {name === "income" ? "Доход" : "Расход"}
                            </span>
                            <span className="font-mono font-medium text-foreground tabular-nums">
                              {formatMoney(Number(value))}
                            </span>
                          </>
                        )}
                        labelFormatter={(value) => String(value)}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    dataKey="income"
                    type="monotone"
                    stroke="var(--color-income)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="expense"
                    type="monotone"
                    stroke="var(--color-expense)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Рост капитализации</CardTitle>
              <CardDescription>
                Изменение капитализации по всем дням.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={netWorthConfig}
                className="h-[180px] w-full aspect-auto"
              >
                <LineChart data={netWorthSeries} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} interval={Math.max(0, Math.floor(netWorthSeries.length / 6) - 1)} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={4} width={50} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}к` : String(v)} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <span className="font-mono font-medium text-foreground tabular-nums">
                            {formatMoney(Number(value))}
                          </span>
                        )}
                        labelFormatter={(value) => String(value)}
                      />
                    }
                  />
                  <Line
                    dataKey="netWorth"
                    type="monotone"
                    stroke="var(--color-netWorth)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 xl:col-span-3">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Структура доходов</CardTitle>
              <CardDescription>
                Доли категорий доходов за выбранный месяц.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incomeRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет доходов в выбранном месяце.</p>
              ) : (
                <ChartContainer
                  config={incomePieConfig}
                  className="mx-auto h-[180px] w-full max-w-[220px] aspect-auto"
                >
                  <PieChart>
                    <ChartTooltip
                      isAnimationActive={false}
                      content={<PieSliceTooltip />}
                    />
                    <Pie
                      data={incomeRows}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                      strokeWidth={1}
                    >
                      {incomeRows.map((entry) => (
                        <Cell key={entry.categoryId} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Структура расходов</CardTitle>
              <CardDescription>
                Доли категорий расходов за выбранный месяц.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expenseRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет расходов в выбранном месяце.</p>
              ) : (
                <ChartContainer
                  config={expensePieConfig}
                  className="mx-auto h-[180px] w-full max-w-[220px] aspect-auto"
                >
                  <PieChart>
                    <ChartTooltip
                      isAnimationActive={false}
                      content={<PieSliceTooltip />}
                    />
                    <Pie
                      data={expenseRows}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                      strokeWidth={1}
                    >
                      {expenseRows.map((entry) => (
                        <Cell key={entry.categoryId} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              Счета и балансы
            </CardTitle>
            <CardDescription>
              Баланс = стартовый остаток + сумма всех операций по счету. Цвет карточки меняется
              в настройках счета.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {balances.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Пока нет счетов. Добавь первый счет в разделе «Настройки».
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {balances.map((item) => (
                  <article
                    key={item.account.id}
                    className={cn(
                      "rounded-2xl border p-4 shadow-sm",
                      accountCardColorClass(item.account.color)
                    )}
                  >
                    <div className="mb-4 flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{item.account.name}</p>
                      <Badge variant={item.account.type === "debt" ? "secondary" : "outline"}>
                        {accountTypeLabel(item.account.type)}
                      </Badge>
                    </div>
                    <p
                      className={cn(
                        "text-3xl font-semibold tracking-tight",
                        item.balance < 0 ? "text-rose-600 dark:text-rose-400" : ""
                      )}
                    >
                      {formatMoney(item.balance)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full xl:col-span-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Последние операции месяца
            </CardTitle>
            <CardDescription>
              {hydrated
                ? "Лента операций за выбранный месяц."
                : "Загружаю данные из локального хранилища..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOperations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет операций в этом месяце.</p>
            ) : (
              recentOperations.map((operation) => (
                <div
                  key={operation.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {transactionTypeLabel(operation.type)} · {operation.transactionDate}
                    </p>
                    {operation.note ? (
                      <p className="text-xs text-muted-foreground">{operation.note}</p>
                    ) : null}
                  </div>
                  <p
                    className={
                      operation.type === "expense"
                        ? "text-lg font-semibold text-rose-600"
                        : "text-lg font-semibold"
                    }
                  >
                    {operation.type === "expense"
                      ? `−${formatMoney(operation.amount)}`
                      : operation.type === "income"
                        ? `+${formatMoney(operation.amount)}`
                        : formatMoney(operation.amount)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
