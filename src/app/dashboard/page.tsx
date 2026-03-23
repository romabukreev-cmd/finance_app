import { ArrowDownCircle, ArrowUpCircle, ArrowUpDown, TrendingUp } from "lucide-react"
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

const accounts = [
  { name: "Сбер Карта", kind: "Актив", amount: 126500 },
  { name: "Накопительный счёт", kind: "Актив", amount: 242000 },
  { name: "Кредит", kind: "Долг", amount: -38500 },
]

const monthStats = {
  income: 116000,
  expense: 78400,
  diff: 37600,
  netWorth: 330000,
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value)

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Дашборд"
        description="Обзор текущего месяца: капитализация, счета, доходы и расходы."
        actions={
          <>
            <Button className="gap-2">
              <ArrowUpCircle className="h-4 w-4" />
              Доход
            </Button>
            <Button variant="secondary" className="gap-2">
              <ArrowDownCircle className="h-4 w-4" />
              Расход
            </Button>
            <Button variant="outline" className="gap-2">
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
            <CardTitle>{formatMoney(monthStats.netWorth)}</CardTitle>
          </CardHeader>
          <CardFooter className="text-xs text-muted-foreground">
            Активы минус долги на сегодня
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Доход за месяц</CardDescription>
            <CardTitle className="text-emerald-600">
              {formatMoney(monthStats.income)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="text-xs text-muted-foreground">
            Только операции типа income
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Расход за месяц</CardDescription>
            <CardTitle className="text-rose-600">
              {formatMoney(monthStats.expense)}
            </CardTitle>
          </CardHeader>
          <CardFooter className="text-xs text-muted-foreground">
            Только операции типа expense
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Разница месяца</CardDescription>
            <CardTitle>{formatMoney(monthStats.diff)}</CardTitle>
          </CardHeader>
          <CardFooter className="text-xs text-muted-foreground">
            Доход минус расход
          </CardFooter>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Счета</CardTitle>
            <CardDescription>
              Баланс считается автоматически: стартовый остаток + операции.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.name}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <p className="font-medium">{account.name}</p>
                  <Badge variant={account.kind === "Долг" ? "secondary" : "outline"}>
                    {account.kind}
                  </Badge>
                </div>
                <p
                  className={
                    account.amount < 0 ? "font-semibold text-rose-600" : "font-semibold"
                  }
                >
                  {formatMoney(account.amount)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Графики (заглушка)</CardTitle>
            <CardDescription>
              Здесь будут линии доход/расход и круг расходов по категориям.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium">Доходы vs расходы</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Подключим после реализации реальных данных и фильтра по месяцу.
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-medium">Расходы по категориям</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Переводы не участвуют в аналитике по категориям.
              </p>
            </div>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Ключевое правило MVP: transfer влияет только на балансы счетов.
          </CardFooter>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Последние операции месяца
          </CardTitle>
          <CardDescription>
            Здесь будет быстрый список последних операций за выбранный месяц.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
