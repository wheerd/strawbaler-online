import type { IconProps } from './IconProps'

function BrickIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="2" y="2" width="4.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="6.5" y="2" width="6.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />

      <rect x="2" y="4.5" width="6.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="8.5" y="4.5" width="4.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />

      <rect x="2" y="7" width="4.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="6.5" y="7" width="6.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />

      <rect x="2" y="9.5" width="6.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="8.5" y="9.5" width="4.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />

      <rect x="2" y="12" width="4.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
      <rect x="6.5" y="12" width="6.5" height="2.5" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

export default BrickIcon
