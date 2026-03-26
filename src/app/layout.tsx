import type { Metadata } from "next"
import { FinanceProvider } from "@/components/finance/finance-provider"
import { MainNav } from "@/components/layout/main-nav"
import { RegisterServiceWorker } from "@/components/pwa/register-sw"
import { ThemeProvider } from "@/components/theme/theme-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Финансы MVP",
  description: "Личный учёт финансов: счета, операции и аналитика по месяцам",
  applicationName: "Финансы MVP",
  icons: {
    icon: [
      { url: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-muted/30">
        <RegisterServiceWorker />
        <ThemeProvider>
          <FinanceProvider>
            <MainNav />
            <main className="flex w-full flex-1 flex-col p-4 pb-24 md:p-8 md:pb-8">
              {children}
            </main>
          </FinanceProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
