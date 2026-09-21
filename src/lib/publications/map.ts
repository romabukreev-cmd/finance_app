export function mapChannel(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    name: r.name as string,
    lang: r.lang as string,
    url: r.url as string,
    targetDuration: r.target_duration as string,
    hint: r.hint as string,
    planWeekdays: (r.plan_weekdays as number[]) ?? [],
    sortOrder: Number(r.sort_order),
    isActive: Boolean(r.is_active),
  }
}
