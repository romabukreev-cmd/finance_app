"use client"

import { Suspense, useState, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme/theme-toggle"

function LoginForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/"

  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Ошибка входа" }))
        setError(data.error ?? "Ошибка входа")
        setLoading(false)
        return
      }

      // Hard redirect to update middleware state
      window.location.href = redirect
    } catch {
      setError("Не удалось подключиться")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
            <Lock className="size-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Личный кабинет</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Введите пароль для входа
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="h-12 text-base"
            disabled={loading}
          />

          {error && (
            <p className="text-sm text-rose-500 text-center">{error}</p>
          )}

          <Button
            type="submit"
            className="h-12 w-full text-base font-semibold"
            disabled={loading || !password}
          >
            {loading ? "Проверяю..." : "Войти"}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Загрузка...</div>}>
      <LoginForm />
    </Suspense>
  )
}
