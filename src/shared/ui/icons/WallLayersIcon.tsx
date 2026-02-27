import type { IconProps } from './types'

function WallLayersIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 1 H 10 V 14 H 4Z" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 1" />
      <path d="M3.5 1 H 5 V 14 H 3.5Z" fill="currentColor" />
      <path d="M9 1 H 10 V 14 H 9Z" fill="currentColor" />
    </svg>
  )
}

export default WallLayersIcon
