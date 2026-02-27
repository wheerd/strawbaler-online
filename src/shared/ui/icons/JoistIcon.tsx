import type { IconProps } from './types'

function JoistIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 40 115 40" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect
        x="10"
        y="50"
        width="15"
        height="24"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity={0.5}
        strokeWidth="1"
      />
      <rect
        x="50"
        y="50"
        width="15"
        height="24"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity={0.5}
        strokeWidth="1"
      />
      <rect
        x="90"
        y="50"
        width="15"
        height="24"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity={0.5}
        strokeWidth="1"
      />
      <line x1="2" y1="50" x2="113" y2="50" stroke="currentColor" strokeWidth="10" />
    </svg>
  )
}

export default JoistIcon
