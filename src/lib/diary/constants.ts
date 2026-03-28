import type { BuffDebuff, WorkDirection } from "./types"

export const DEFAULT_BUFFS: BuffDebuff[] = [
  { id: "buff-walk", name: "Прогулка", emoji: "🚶", type: "buff" },
  { id: "buff-morning", name: "Разминка", emoji: "🧘", type: "buff" },
  { id: "buff-shower", name: "Контрастный душ", emoji: "🚿", type: "buff" },
  { id: "buff-water", name: "Стакан воды", emoji: "💧", type: "buff" },
  { id: "buff-food", name: "Здоровое питание", emoji: "🥗", type: "buff" },
  { id: "buff-workout", name: "Тренировка", emoji: "💪", type: "buff" },
  { id: "buff-read", name: "Чтение", emoji: "📖", type: "buff" },
]

export const DEFAULT_DEBUFFS: BuffDebuff[] = [
  { id: "debuff-home", name: "Дома весь день", emoji: "🏠", type: "debuff" },
  { id: "debuff-scroll", name: "Залипал в ленте", emoji: "📱", type: "debuff" },
  { id: "debuff-junk", name: "Фастфуд", emoji: "🍔", type: "debuff" },
]

export const DEFAULT_WORK_DIRECTIONS: WorkDirection[] = [
  { id: "dir-studio", name: "Студия", color: "emerald" },
  { id: "dir-media", name: "Медийка", color: "violet" },
  { id: "dir-learning", name: "Обучения", color: "amber" },
  { id: "dir-dev", name: "Разработка", color: "sky" },
]

export const DEFAULT_DIARY_CATEGORIES = [
  { id: "dcat-idea", name: "Идея", color: "amber" },
  { id: "dcat-work", name: "Работа", color: "emerald" },
  { id: "dcat-personal", name: "Личное", color: "violet" },
  { id: "dcat-health", name: "Здоровье", color: "teal" },
  { id: "dcat-finance", name: "Финансы", color: "sky" },
  { id: "dcat-learning", name: "Обучение", color: "indigo" },
]

export const DIARY_CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  amber: { bg: "bg-amber-100 dark:bg-amber-950/50", text: "text-amber-800 dark:text-amber-200", border: "border-amber-300 dark:border-amber-800" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-950/50", text: "text-emerald-800 dark:text-emerald-200", border: "border-emerald-300 dark:border-emerald-800" },
  violet: { bg: "bg-violet-100 dark:bg-violet-950/50", text: "text-violet-800 dark:text-violet-200", border: "border-violet-300 dark:border-violet-800" },
  teal: { bg: "bg-teal-100 dark:bg-teal-950/50", text: "text-teal-800 dark:text-teal-200", border: "border-teal-300 dark:border-teal-800" },
  sky: { bg: "bg-sky-100 dark:bg-sky-950/50", text: "text-sky-800 dark:text-sky-200", border: "border-sky-300 dark:border-sky-800" },
  indigo: { bg: "bg-indigo-100 dark:bg-indigo-950/50", text: "text-indigo-800 dark:text-indigo-200", border: "border-indigo-300 dark:border-indigo-800" },
  rose: { bg: "bg-rose-100 dark:bg-rose-950/50", text: "text-rose-800 dark:text-rose-200", border: "border-rose-300 dark:border-rose-800" },
  orange: { bg: "bg-orange-100 dark:bg-orange-950/50", text: "text-orange-800 dark:text-orange-200", border: "border-orange-300 dark:border-orange-800" },
  slate: { bg: "bg-slate-100 dark:bg-slate-900/50", text: "text-slate-800 dark:text-slate-200", border: "border-slate-300 dark:border-slate-700" },
}
