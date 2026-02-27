import type { IconProps } from './IconProps'

function FloorOpeningIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M3 3 H 12 L 14 14 H 1 Z" stroke="currentColor" strokeWidth="1" />
      <path d="M5.3 5.3 H 9.1 L 9.8 11 H 4.8 Z" stroke="currentColor" strokeWidth="0.8" />
      <path d="M5.3 5.3 v 1.5 H 9.1 v -1.5" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

export default FloorOpeningIcon
