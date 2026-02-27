import type { IconProps } from './IconProps'

function FloorWindowPresetIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="4" y="1" width="7" height="12" stroke="currentColor" strokeWidth="1" fill="none" />
      <line x1="1" y1="13" x2="14" y2="13" stroke="currentColor" strokeWidth="1.5" />
      <line x1="7.5" y1="1" x2="7.5" y2="13" stroke="currentColor" strokeWidth="0.5" />
      <line x1="4" y1="7" x2="11" y2="7" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

export default FloorWindowPresetIcon
