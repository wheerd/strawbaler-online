import type { IconProps } from './types'

function PerimeterPresetsIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 5 V 2 H 13 V 10 H 12" stroke="currentColor" strokeWidth="1" />
      <path d="M2 5 H 7.5 V 9 H 12 V 13 H 2 Z" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

export default PerimeterPresetsIcon
