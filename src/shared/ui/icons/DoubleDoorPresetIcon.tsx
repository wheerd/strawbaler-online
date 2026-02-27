import type { IconProps } from './IconProps'

function DoubleDoorPresetIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="1" y="2" width="6" height="11" stroke="currentColor" strokeWidth="1" fill="none" />
      <rect x="8" y="2" width="6" height="11" stroke="currentColor" strokeWidth="1" fill="none" />
      <circle cx="6" cy="7.5" r="0.4" fill="currentColor" />
      <circle cx="9" cy="7.5" r="0.4" fill="currentColor" />
    </svg>
  )
}

export default DoubleDoorPresetIcon
