import { DiaryProvider } from "@/components/diary/diary-provider"

export default function DiaryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DiaryProvider>{children}</DiaryProvider>
}
