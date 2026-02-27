import type { IconProps } from './types'

function FilledIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 40 115 40" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect
        x="10"
        y="50"
        width="15"
        height="36"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity={0.7}
        strokeWidth="1"
      />
      <rect x="25" y="50" width="25" height="36" fill="currentColor" fillOpacity={0.3} />
      <rect
        x="50"
        y="50"
        width="15"
        height="36"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity={0.7}
        strokeWidth="1"
      />
      <rect x="65" y="50" width="25" height="36" fill="currentColor" fillOpacity={0.3} />
      <rect
        x="90"
        y="50"
        width="15"
        height="36"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity={0.7}
        strokeWidth="1"
      />
      <line x1="2" y1="50" x2="113" y2="50" stroke="currentColor" strokeWidth="5" />
      <line x1="2" y1="86" x2="113" y2="86" stroke="currentColor" strokeWidth="5" />
    </svg>
  )
}

export default FilledIcon
