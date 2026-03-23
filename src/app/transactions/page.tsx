import { Filter, Plus } from "lucide-react"
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

const rows = [
  {
    date: "23.03.2026",
    type: "expense",
    account: "Сбер Карта",
    category: "Еда",
    amount: -1750,
    comment: "Продукты",
  },
  {
    date: "22.03.2026",
    type: "income",
    account: "Сбер Карта",
    category: "Услуги",
    amount: 25000,
    comment: "Оплата от клиента",
  },
  {
    date: "20.03.2026",
    type: "transfer",
    account: "Сбер Карта -> Накопительный",
    category: "—",
    amount: 10000,
    comment: "Перевод между счетами",
  },
]

const formatMoney = (value: number) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value)

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Операции"
        description="Список операций за выбранный месяц с фильтрами и редактированием."
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Добавить операцию
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Фильтры
          </CardTitle>
          <CardDescription>Основа для помесячного учета и поиска.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input type="month" defaultValue="2026-03" />

          <Select defaultValue="all">
            <SelectTrigger>
              <SelectValue placeholder="Тип операции" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все типы</SelectItem>
              <SelectItem value="income">Доход</SelectItem>
              <SelectItem value="expense">Расход</SelectItem>
              <SelectItem value="transfer">Перевод</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all">
            <SelectTrigger>
              <SelectValue placeholder="Счет" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все счета</SelectItem>
              <SelectItem value="sber">Сбер Карта</SelectItem>
              <SelectItem value="saving">Накопительный</SelectItem>
              <SelectItem value="credit">Кредит</SelectItem>
            </SelectContent>
          </Select>

          <Select defaultValue="all">
            <SelectTrigger>
              <SelectValue placeholder="Категория" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              <SelectItem value="food">Еда</SelectItem>
              <SelectItem value="service">Услуги</SelectItem>
              <SelectItem value="other">Прочее</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Список операций</CardTitle>
          <CardDescription>
            Для `transfer` категории нет, и такие записи не попадают в доход/расход.
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.type === "income"
                          ? "outline"
                          : row.type === "expense"
                            ? "secondary"
                            : "default"
                      }
                    >
                      {row.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.account}</TableCell>
                  <TableCell>{row.category}</TableCell>
                  <TableCell
                    className={
                      row.amount < 0 ? "text-right font-medium text-rose-600" : "text-right font-medium"
                    }
                  >
                    {formatMoney(row.amount)}
                  </TableCell>
                  <TableCell>{row.comment}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
