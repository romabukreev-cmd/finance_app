import type { AccountColor } from "@/lib/finance/types"

export const DEFAULT_ACCOUNT_COLOR: AccountColor = "slate"

type AccountColorOption = {
  value: AccountColor
  label: string
  swatchClass: string
}

export const ACCOUNT_COLOR_OPTIONS: AccountColorOption[] = [
  { value: "slate", label: "Серый", swatchClass: "bg-slate-500" },
  { value: "stone", label: "Каменный", swatchClass: "bg-stone-500" },
  { value: "red", label: "Красный", swatchClass: "bg-red-500" },
  { value: "orange", label: "Оранжевый", swatchClass: "bg-orange-500" },
  { value: "amber", label: "Янтарный", swatchClass: "bg-amber-500" },
  { value: "yellow", label: "Жёлтый", swatchClass: "bg-yellow-400" },
  { value: "lime", label: "Лайм", swatchClass: "bg-lime-500" },
  { value: "green", label: "Зелёный", swatchClass: "bg-green-500" },
  { value: "emerald", label: "Изумрудный", swatchClass: "bg-emerald-500" },
  { value: "teal", label: "Бирюзовый", swatchClass: "bg-teal-500" },
  { value: "cyan", label: "Циан", swatchClass: "bg-cyan-500" },
  { value: "sky", label: "Небесный", swatchClass: "bg-sky-500" },
  { value: "blue", label: "Синий", swatchClass: "bg-blue-500" },
  { value: "indigo", label: "Индиго", swatchClass: "bg-indigo-500" },
  { value: "violet", label: "Фиолетовый", swatchClass: "bg-violet-500" },
  { value: "purple", label: "Пурпурный", swatchClass: "bg-purple-500" },
  { value: "pink", label: "Розовый", swatchClass: "bg-pink-500" },
  { value: "rose", label: "Роза", swatchClass: "bg-rose-500" },
]

const ACCOUNT_COLOR_SET = new Set<AccountColor>(ACCOUNT_COLOR_OPTIONS.map((item) => item.value))

const ACCOUNT_CARD_CLASS_BY_COLOR: Record<AccountColor, string> = {
  slate: "border-slate-200 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-900/40",
  stone: "border-stone-200 bg-stone-50/90 dark:border-stone-700 dark:bg-stone-900/40",
  red: "border-red-200 bg-red-50/90 dark:border-red-800/60 dark:bg-red-950/30",
  orange: "border-orange-200 bg-orange-50/90 dark:border-orange-800/60 dark:bg-orange-950/30",
  amber: "border-amber-200 bg-amber-50/90 dark:border-amber-800/60 dark:bg-amber-950/30",
  yellow: "border-yellow-200 bg-yellow-50/90 dark:border-yellow-800/60 dark:bg-yellow-950/30",
  lime: "border-lime-200 bg-lime-50/90 dark:border-lime-800/60 dark:bg-lime-950/30",
  green: "border-green-200 bg-green-50/90 dark:border-green-800/60 dark:bg-green-950/30",
  emerald: "border-emerald-200 bg-emerald-50/90 dark:border-emerald-800/60 dark:bg-emerald-950/30",
  teal: "border-teal-200 bg-teal-50/90 dark:border-teal-800/60 dark:bg-teal-950/30",
  cyan: "border-cyan-200 bg-cyan-50/90 dark:border-cyan-800/60 dark:bg-cyan-950/30",
  sky: "border-sky-200 bg-sky-50/90 dark:border-sky-800/60 dark:bg-sky-950/30",
  blue: "border-blue-200 bg-blue-50/90 dark:border-blue-800/60 dark:bg-blue-950/30",
  indigo: "border-indigo-200 bg-indigo-50/90 dark:border-indigo-800/60 dark:bg-indigo-950/30",
  violet: "border-violet-200 bg-violet-50/90 dark:border-violet-800/60 dark:bg-violet-950/30",
  purple: "border-purple-200 bg-purple-50/90 dark:border-purple-800/60 dark:bg-purple-950/30",
  pink: "border-pink-200 bg-pink-50/90 dark:border-pink-800/60 dark:bg-pink-950/30",
  rose: "border-rose-200 bg-rose-50/90 dark:border-rose-800/60 dark:bg-rose-950/30",
}

export function isAccountColor(value: unknown): value is AccountColor {
  return typeof value === "string" && ACCOUNT_COLOR_SET.has(value as AccountColor)
}

export function normalizeAccountColor(value: unknown): AccountColor {
  return isAccountColor(value) ? value : DEFAULT_ACCOUNT_COLOR
}

export function getAccountColorOption(color: AccountColor) {
  return ACCOUNT_COLOR_OPTIONS.find((item) => item.value === color) ?? ACCOUNT_COLOR_OPTIONS[0]
}

export function accountCardColorClass(color: AccountColor) {
  return ACCOUNT_CARD_CLASS_BY_COLOR[color]
}
