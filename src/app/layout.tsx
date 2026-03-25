import type { Metadata } from "next"
import { FinanceProvider } from "@/components/finance/finance-provider"
import { MainNav } from "@/components/layout/main-nav"
import "./globals.css"

export const metadata: Metadata = {
  title: "Финансы MVP",
  description: "Личный учет финансов: счета, операции и аналитика по месяцам",
  applicationName: "Финансы MVP",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full bg-muted/30">
        <FinanceProvider>
          <MainNav />
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-4 pb-24 md:p-8 md:pb-8">
            {children}
          </main>
        </FinanceProvider>
      </body>
    </html>
  )
}
