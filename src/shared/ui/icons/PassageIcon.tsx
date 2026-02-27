import type { IconProps } from './IconProps'

function PassageIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <line x1="1" y1="1" x2="14" y2="1" stroke="currentColor" strokeWidth="0.5" fill="none" />
      <line x1="1" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="0.5" fill="none" />
      <rect x="4" y="3" width="7" height="9" stroke="currentColor" strokeWidth="0.7" fill="none" />
    </svg>
  )
}

export default PassageIcon
