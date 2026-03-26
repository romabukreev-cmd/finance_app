import { ReactNode } from "react"

type PageHeaderProps = {
  title: string
  description: string
  actions?: ReactNode
  descriptionClassName?: string
}

export function PageHeader({
  title,
  description,
  actions,
  descriptionClassName,
}: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className={`mt-1 text-sm text-muted-foreground ${descriptionClassName ?? ""}`}>
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}
