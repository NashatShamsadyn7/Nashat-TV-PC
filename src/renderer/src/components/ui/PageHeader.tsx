type Props = {
  title: string
  subtitle?: string
}

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <div className="px-8 pt-8 pb-4">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      {subtitle && <p className="mt-1 text-ink-200 text-sm">{subtitle}</p>}
    </div>
  )
}
