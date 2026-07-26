type Props = {
  title: string
  subtitle?: string
  /** Small crimson label above the title — the landing page's "eyebrow" device. */
  eyebrow?: string
}

export default function PageHeader({ title, subtitle, eyebrow }: Props) {
  return (
    <div className="px-8 pt-8 pb-4">
      {eyebrow && (
        <p className="text-[11px] font-bold tracking-widest uppercase text-brand-400 mb-1.5">
          {eyebrow}
        </p>
      )}
      {/* font-black + tight leading matches the landing page's display type. */}
      <h1 className="text-3xl font-black leading-tight">{title}</h1>
      {subtitle && <p className="mt-1.5 text-ink-200 text-sm">{subtitle}</p>}
    </div>
  )
}
