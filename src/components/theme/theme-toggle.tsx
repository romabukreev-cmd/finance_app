"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme/theme-provider"

export function ThemeToggle() {
  const { toggleTheme } = useTheme()

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label="Переключить тему"
      title="Переключить тему"
    >
      <Sun className="hidden h-5 w-5 dark:block" />
      <Moon className="block h-5 w-5 dark:hidden" />
    </Button>
  )
}
