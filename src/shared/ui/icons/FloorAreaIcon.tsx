import type { IconProps } from './types'

function FloorAreaIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M3 3 H 12 L 14 14 H 1 Z" stroke="currentColor" strokeWidth="1" />
      <path d="M6 3 L 5.33 14" stroke="currentColor" strokeWidth="0.7" />
      <path d="M9 3 L 9.66 14" stroke="currentColor" strokeWidth="0.7" />
      <path d="M2.33 6.66 h 3.44" stroke="currentColor" strokeWidth="0.7" />
      <path d="M9.66 10.33 h 3.88" stroke="currentColor" strokeWidth="0.7" />
    </svg>
  )
}

export default FloorAreaIcon
