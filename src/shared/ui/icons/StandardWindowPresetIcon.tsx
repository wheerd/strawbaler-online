import type { IconProps } from './IconProps'

function StandardWindowPresetIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="3" y="3" width="9" height="9" stroke="currentColor" strokeWidth="1" fill="none" />
      <line x1="7.5" y1="3" x2="7.5" y2="12" stroke="currentColor" strokeWidth="0.5" />
      <line x1="3" y1="7.5" x2="12" y2="7.5" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

export default StandardWindowPresetIcon
