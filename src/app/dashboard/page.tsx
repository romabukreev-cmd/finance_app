"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowUpDown,
  PiggyBank,
  TrendingUp,
} from "lucide-react"
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis } from "recharts"
import { useFinance } from "@/components/finance/finance-provider"
import { PageHeader } from "@/components/layout/page-header"
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
  currentMonth,
  formatMoney,
  monthKey,
  transactionTypeLabel,
} from "@/lib/finance/format"

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
  const router = useRouter()
  const { hydrated, balances, categories, displayTransactions, netWorth, transactions } =
    useFinance()

  const [selectedMonth, setSelectedMonth] = useState(currentMonth())

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
        actions={
          <>
            <Input
              className="w-[160px]"
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
            />
            <Button className="gap-2" onClick={() => router.push("/transactions")}>
              <ArrowUpCircle className="h-4 w-4" />
              Доход
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => router.push("/transactions")}
            >
              <ArrowDownCircle className="h-4 w-4" />
              Расход
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => router.push("/transactions")}
            >
              <ArrowUpDown className="h-4 w-4" />
              Перевод
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Капитализация</CardDescription>
            <CardTitle>{formatMoney(netWorth)}</CardTitle>
          </CardHeader>
          <CardFooter className="text-xs text-muted-foreground">
            Сумма балансов активов и долгов
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Доход за месяц</CardDescription>
            <CardTitle className="text-emerald-600">{formatMoney(incomeTotal)}</CardTitle>
          </CardHeader>
          <CardFooter className="text-xs text-muted-foreground">
            Только операции типа income
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Расход за месяц</CardDescription>
            <CardTitle className="text-rose-600">{formatMoney(expenseTotal)}</CardTitle>
          </CardHeader>
          <CardFooter className="text-xs text-muted-foreground">
            Только операции типа expense
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Разница месяца</CardDescription>
            <CardTitle className={diff >= 0 ? "text-emerald-600" : "text-rose-600"}>
              {formatMoney(diff)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="text-xs text-muted-foreground">
            Доход минус расход
          </CardFooter>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Динамика доходов и расходов</CardTitle>
            <CardDescription>
              Линии по дням месяца. Переводы в этом графике не учитываются.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={incomeExpenseConfig}
              className="h-[280px] w-full aspect-auto"
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

        <Card>
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
                  className="mx-auto h-[220px] w-full max-w-[280px] aspect-auto"
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
                      innerRadius={52}
                      outerRadius={88}
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
                  {expensePieData.slice(0, 5).map((item) => (
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
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              Счета и балансы
            </CardTitle>
            <CardDescription>
              Баланс = стартовый остаток + сумма всех операций по счету.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {balances.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Пока нет счетов. Добавь первый счет в разделе «Настройки».
              </p>
            ) : (
              balances.map((item) => (
                <div
                  key={item.account.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{item.account.name}</p>
                    <Badge variant={item.account.type === "debt" ? "secondary" : "outline"}>
                      {item.account.type === "debt" ? "Долг" : "Актив"}
                    </Badge>
                  </div>
                  <p className={item.balance < 0 ? "font-semibold text-rose-600" : "font-semibold"}>
                    {formatMoney(item.balance)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
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
                      operation.type === "expense" ? "font-semibold text-rose-600" : "font-semibold"
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
