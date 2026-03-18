import type { TranslatableString } from '@/shared/i18n/TranslatableString'
import { useTranslatableString } from '@/shared/i18n/useTranslatableString'

export function formatValue(value: number | null | undefined, decimals: number): string {
  if (value === null || value === undefined) return '—'
  return value.toFixed(decimals)
}

export function LayerRow({
  label,
  thicknessMm,
  sdValue,
  rValue,
  massPerArea
}: {
  label: TranslatableString
  thicknessMm: number
  sdValue: number | null
  rValue: number | null
  massPerArea: number | null
}): React.JSX.Element {
  const translatedLabel = useTranslatableString(label)
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2 text-xs">
      <span className="truncate" title={translatedLabel}>
        {translatedLabel}
      </span>
      <span className="text-muted-foreground w-12 text-right">{thicknessMm} mm</span>
      <span className="w-14 text-right">{formatValue(sdValue, 2)} m</span>
      <span className="w-14 text-right">{formatValue(rValue, 2)}</span>
      <span className="w-14 text-right">{formatValue(massPerArea, 1)}</span>
    </div>
  )
}
