import type { IconProps } from './types'

function StandardDoorPresetIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="5" y="2" width="5" height="11" stroke="currentColor" strokeWidth="1" fill="none" />
      <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

export default StandardDoorPresetIcon
