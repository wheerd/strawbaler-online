import type { IconProps } from './types'

function TopPlateIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 1 H 10 V 3 H 4Z" fill="currentColor" />
      <path d="M4 3 H 10 V 14 H 4Z" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 1" />
    </svg>
  )
}

export default TopPlateIcon
