"use client"

import Link from "next/link"
import {
  BookOpen,
  Wallet,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { cn } from "@/lib/utils"

const modules = [
  {
    href: "/dashboard",
    label: "Финансы",
    description: "Учёт доходов, расходов и счетов",
    icon: Wallet,
    gradient: "from-emerald-500 to-teal-600",
    shadow: "shadow-emerald-500/25",
  },
  {
    href: "/diary",
    label: "Дневник",
    description: "Мысли, идеи, привычки и рабочие часы",
    icon: BookOpen,
    gradient: "from-violet-500 to-purple-600",
    shadow: "shadow-violet-500/25",
  },
]

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Личный кабинет
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Выбери раздел
        </p>
      </div>

      <div className="grid w-full max-w-2xl gap-6 sm:grid-cols-2">
        {modules.map((mod) => {
          const Icon = mod.icon
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className={cn(
                "group relative flex flex-col items-center gap-4 rounded-3xl border bg-card p-10 text-center transition-all duration-200",
                "hover:-translate-y-1 hover:shadow-xl",
                `hover:${mod.shadow}`
              )}
            >
              <div
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
                  mod.gradient
                )}
              >
                <Icon className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">{mod.label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mod.description}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
