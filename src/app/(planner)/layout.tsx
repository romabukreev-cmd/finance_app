import { PlannerProvider } from "@/components/planner/planner-provider"

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PlannerProvider>{children}</PlannerProvider>
}
