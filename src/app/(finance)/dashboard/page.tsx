"use client"

import { useMemo, useState } from "react"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowUpDown,
  PiggyBank,
  TrendingUp,
} from "lucide-react"
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis } from "recharts"
import { useFinance } from "@/components/finance/finance-provider"
import { QuickOperationDialog } from "@/components/finance/quick-operation-dialog"
import { PageHeader } from "@/components/layout/page-header"
import { accountCardColorClass } from "@/lib/finance/account-colors"
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

function monthDaysCount(monthValue: string) {
  const [yearRaw, monthRaw] = monthValue.split("-")
  const year = Number(yearRaw)
  const month = Number(monthRaw)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return 31
  }

  return new Date(year, month, 0).getDate()
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
    const daysCount = monthDaysCount(selectedMonth)

    const points = Array.from({ length: daysCount }, (_, index) => ({
      day: String(index + 1).padStart(2, "0"),
      income: 0,
      expense: 0,
    }))

    for (const transaction of monthTransactions) {
      const dayIndex = Number(transaction.transactionDate.slice(8, 10)) - 1

      if (dayIndex < 0 || dayIndex >= daysCount) {
        continue
      }

      if (transaction.type === "income") {
        points[dayIndex].income += transaction.amount
      }

      if (transaction.type === "expense") {
        points[dayIndex].expense += transaction.amount
      }
    }

    return points
  }, [monthTransactions, selectedMonth])

  const netWorthSeries = useMemo(() => {
    const daysCount = monthDaysCount(selectedMonth)
    const monthStart = `${selectedMonth}-01`
    const startBalancesByAccount = new Map<string, number>(
      accounts.map((account) => [account.id, account.startBalance])
    )
    const dailyDelta = Array.from({ length: daysCount }, () => 0)

    for (const transaction of transactions) {
      if (transaction.transactionDate < monthStart) {
        const current = startBalancesByAccount.get(transaction.accountId) ?? 0
        startBalancesByAccount.set(transaction.accountId, current + transaction.signedAmount)
        continue
      }

      if (monthKey(transaction.transactionDate) !== selectedMonth) {
        continue
      }

      const dayIndex = Number(transaction.transactionDate.slice(8, 10)) - 1

      if (dayIndex < 0 || dayIndex >= daysCount) {
        continue
      }

      dailyDelta[dayIndex] += transaction.signedAmount
    }

    let rollingValue = Array.from(startBalancesByAccount.values()).reduce(
      (sum, value) => sum + value,
      0
    )

    return dailyDelta.map((delta, index) => {
      rollingValue += delta
      return {
        day: String(index + 1).padStart(2, "0"),
        netWorth: rollingValue,
      }
    })
  }, [accounts, selectedMonth, transactions])

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
          return {
            categoryId,
            name: category?.name ?? "Прочее",
            value,
          }
        })
        .sort((left, right) => right.value - left.value),
    [categories, monthTransactions]
  )

  const expensePieData = useMemo(
    () =>
      expenseRows.map((item, index) => ({
        ...item,
        fill: `var(--color-chart-${(index % 5) + 1})`,
      })),
    [expenseRows]
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
          return {
            categoryId,
            name: category?.name ?? "Прочее",
            value,
          }
        })
        .sort((left, right) => right.value - left.value),
    [categories, monthTransactions]
  )

  const incomePieData = useMemo(
    () =>
      incomeRows.map((item, index) => ({
        ...item,
        fill: `var(--color-chart-${(index % 5) + 1})`,
      })),
    [incomeRows]
  )

  const recentOperations = useMemo(
    () =>
      displayTransactions
        .filter((operation) => monthKey(operation.transactionDate) === selectedMonth)
        .slice(0, 6),
    [displayTransactions, selectedMonth]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Дашборд"
        description="Визуальный обзор выбранного месяца: деньги, динамика и структура трат."
        descriptionClassName="text-base md:text-lg"
        actions={
          <>
            <Input
              className="h-14 w-[220px] text-xl font-semibold"
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            />
            <Button
              className="h-14 gap-2 px-6 text-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => openQuickDialog("income")}
            >
              <ArrowUpCircle className="h-5 w-5" />
              Доход
            </Button>
            <Button
              className="h-14 gap-2 px-6 text-xl font-semibold bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => openQuickDialog("expense")}
            >
              <ArrowDownCircle className="h-5 w-5" />
              Расход
            </Button>
            <Button
              variant="outline"
              className="h-14 gap-2 px-6 text-xl font-semibold"
              onClick={() => openQuickDialog("transfer")}
            >
              <ArrowUpDown className="h-5 w-5" />
              Перевод
            </Button>
          </>
        }
      />

      {quickDialogOpen ? (
        <QuickOperationDialog
          open={quickDialogOpen}
          type={quickType}
          onOpenChange={setQuickDialogOpen}
        />
      ) : null}

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
                Линии по дням месяца. Переводы в этом графике не учитываются.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={incomeExpenseConfig}
                className="h-[230px] w-full aspect-auto"
              >
                <LineChart data={incomeExpenseSeries} margin={{ left: 8, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} />
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
                        labelFormatter={(value) => `${value}.${selectedMonth.slice(5, 7)}`}
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
                Изменение капитализации по дням выбранного месяца.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={netWorthConfig}
                className="h-[230px] w-full aspect-auto"
              >
                <LineChart data={netWorthSeries} margin={{ left: 8, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <span className="font-mono font-medium text-foreground tabular-nums">
                            {formatMoney(Number(value))}
                          </span>
                        )}
                        labelFormatter={(value) => `${value}.${selectedMonth.slice(5, 7)}`}
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
            <CardContent className="space-y-3">
              {incomePieData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет доходов в выбранном месяце.</p>
              ) : (
                <>
                  <ChartContainer
                    config={incomePieConfig}
                    className="mx-auto h-[190px] w-full max-w-[220px] aspect-auto"
                  >
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) => (
                              <>
                                <span className="text-muted-foreground">{String(name)}</span>
                                <span className="font-mono font-medium text-foreground tabular-nums">
                                  {formatMoney(Number(value))}
                                </span>
                              </>
                            )}
                          />
                        }
                      />
                      <Pie
                        data={incomePieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={46}
                        outerRadius={80}
                        paddingAngle={3}
                        strokeWidth={1}
                      >
                        {incomePieData.map((entry) => (
                          <Cell key={entry.categoryId} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>

                  <div className="space-y-2">
                    {incomePieData.slice(0, 4).map((item) => (
                      <div key={item.categoryId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">{formatMoney(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
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
            <CardContent className="space-y-4">
              {expensePieData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет расходов в выбранном месяце.</p>
              ) : (
                <>
                  <ChartContainer
                    config={expensePieConfig}
                    className="mx-auto h-[190px] w-full max-w-[220px] aspect-auto"
                  >
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) => (
                              <>
                                <span className="text-muted-foreground">{String(name)}</span>
                                <span className="font-mono font-medium text-foreground tabular-nums">
                                  {formatMoney(Number(value))}
                                </span>
                              </>
                            )}
                          />
                        }
                      />
                      <Pie
                        data={expensePieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={46}
                        outerRadius={80}
                        paddingAngle={3}
                        strokeWidth={1}
                      >
                        {expensePieData.map((entry) => (
                          <Cell key={entry.categoryId} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>

                  <div className="space-y-2">
                    {expensePieData.slice(0, 4).map((item) => (
                      <div key={item.categoryId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span>{item.name}</span>
                        </div>
                        <span className="font-medium">{formatMoney(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
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
