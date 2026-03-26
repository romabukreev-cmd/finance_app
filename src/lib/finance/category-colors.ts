import type { CategoryColor } from "@/lib/finance/types"

export const DEFAULT_CATEGORY_COLOR: CategoryColor = "gray"

type CategoryColorOption = {
  value: CategoryColor
  label: string
  swatchClass: string
}

export const CATEGORY_COLOR_OPTIONS: CategoryColorOption[] = [
  { value: "gray", label: "Серый", swatchClass: "bg-slate-500" },
  { value: "brown", label: "Коричневый", swatchClass: "bg-amber-800" },
  { value: "orange", label: "Оранжевый", swatchClass: "bg-orange-500" },
  { value: "amber", label: "Янтарный", swatchClass: "bg-amber-500" },
  { value: "yellow", label: "Жёлтый", swatchClass: "bg-yellow-400" },
  { value: "lime", label: "Лайм", swatchClass: "bg-lime-500" },
  { value: "green", label: "Зелёный", swatchClass: "bg-emerald-500" },
  { value: "teal", label: "Бирюзовый", swatchClass: "bg-teal-500" },
  { value: "cyan", label: "Циан", swatchClass: "bg-cyan-500" },
  { value: "sky", label: "Небесный", swatchClass: "bg-sky-500" },
  { value: "blue", label: "Синий", swatchClass: "bg-blue-500" },
  { value: "indigo", label: "Индиго", swatchClass: "bg-indigo-500" },
  { value: "purple", label: "Фиолетовый", swatchClass: "bg-violet-500" },
  { value: "pink", label: "Розовый", swatchClass: "bg-pink-500" },
  { value: "rose", label: "Роза", swatchClass: "bg-rose-500" },
  { value: "red", label: "Красный", swatchClass: "bg-red-500" },
]

const CATEGORY_COLOR_SET = new Set<CategoryColor>(
  CATEGORY_COLOR_OPTIONS.map((item) => item.value)
)

const CATEGORY_BADGE_CLASS_BY_COLOR: Record<CategoryColor, string> = {
  gray: "border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200",
  brown: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  orange: "border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-800 dark:bg-orange-950/50 dark:text-orange-200",
  amber: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  yellow: "border-yellow-300 bg-yellow-100 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-200",
  lime: "border-lime-300 bg-lime-100 text-lime-900 dark:border-lime-800 dark:bg-lime-950/50 dark:text-lime-200",
  green: "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  teal: "border-teal-300 bg-teal-100 text-teal-900 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200",
  cyan: "border-cyan-300 bg-cyan-100 text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200",
  sky: "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200",
  blue: "border-blue-300 bg-blue-100 text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200",
  indigo: "border-indigo-300 bg-indigo-100 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200",
  purple: "border-violet-300 bg-violet-100 text-violet-900 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200",
  pink: "border-pink-300 bg-pink-100 text-pink-900 dark:border-pink-800 dark:bg-pink-950/50 dark:text-pink-200",
  rose: "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-200",
  red: "border-red-300 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200",
}

export function isCategoryColor(value: unknown): value is CategoryColor {
  return typeof value === "string" && CATEGORY_COLOR_SET.has(value as CategoryColor)
}

export function normalizeCategoryColor(value: unknown): CategoryColor {
  return isCategoryColor(value) ? value : DEFAULT_CATEGORY_COLOR
}

export function getCategoryColorOption(color: CategoryColor) {
  return CATEGORY_COLOR_OPTIONS.find((item) => item.value === color) ?? CATEGORY_COLOR_OPTIONS[0]
}

export function categoryBadgeClass(color: CategoryColor) {
  return CATEGORY_BADGE_CLASS_BY_COLOR[color]
}
