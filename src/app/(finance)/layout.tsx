import { FinanceProvider } from "@/components/finance/finance-provider"

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <FinanceProvider>{children}</FinanceProvider>
}
