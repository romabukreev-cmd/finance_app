import { Plus } from "lucide-react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const accounts = [
  { name: "Сбер Карта", type: "asset", startBalance: "80 000 ₽" },
  { name: "Накопительный счёт", type: "asset", startBalance: "200 000 ₽" },
  { name: "Кредит", type: "debt", startBalance: "-50 000 ₽" },
]

const categories = [
  { name: "Еда", kind: "expense", system: false },
  { name: "Такси", kind: "expense", system: false },
  { name: "Услуги", kind: "income", system: false },
  { name: "Прочее", kind: "expense/income", system: true },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Настройки"
        description="Управление счетами и категориями для операций."
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Счета</CardTitle>
            <CardDescription>
              Типы: `asset` (актив) и `debt` (долг). Баланс пересчитывается автоматически.
            </CardDescription>
          </div>
          <Button size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Счет
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead className="text-right">Стартовый остаток</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.name}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{account.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{account.startBalance}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Категории</CardTitle>
            <CardDescription>
              При удалении обычной категории операции переводятся в системную категорию
              «Прочее».
            </CardDescription>
          </div>
          <Button size="sm" variant="secondary" className="gap-1">
            <Plus className="h-4 w-4" />
            Категория
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.name}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <p className="font-medium">{category.name}</p>
                  <Badge variant="outline">{category.kind}</Badge>
                </div>
                {category.system ? (
                  <Badge>Системная</Badge>
                ) : (
                  <Button size="sm" variant="ghost">
                    Редактировать
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
