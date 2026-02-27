import type { IconProps } from './IconProps'

function SmallWindowPresetIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="4" y="5" width="7" height="5" stroke="currentColor" strokeWidth="1" fill="none" />
      <line x1="7.5" y1="5" x2="7.5" y2="10" stroke="currentColor" strokeWidth="0.5" />
      <line x1="4" y1="7.5" x2="11" y2="7.5" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

export default SmallWindowPresetIcon
