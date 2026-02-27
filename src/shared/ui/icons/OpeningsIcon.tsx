import type { IconProps } from './IconProps'

function OpeningsIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="1" y="3" width="6" height="11" stroke="currentColor" strokeWidth="0.7" fill="none" />
      <circle cx="2.5" cy="8.5" r="0.7" fill="currentColor" />

      <rect x="9" y="4" width="5" height="7" stroke="currentColor" strokeWidth="0.7" fill="none" />
      <line x1="11.5" y1="4" x2="11.5" y2="11" stroke="currentColor" strokeWidth="0.5" />
      <line x1="9" y1="7.5" x2="14" y2="7.5" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

export default OpeningsIcon
