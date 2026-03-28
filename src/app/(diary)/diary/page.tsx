"use client"

import { useDiary } from "@/components/diary/diary-provider"

export default function DiaryPage() {
  const { hydrated, categories, entries } = useDiary()

  if (!hydrated) {
    return <p>Загрузка...</p>
  }

  return (
    <div>
      <h1>Дневник</h1>
      <p>Категорий: {categories.length}</p>
      <p>Записей: {entries.length}</p>
    </div>
  )
}
