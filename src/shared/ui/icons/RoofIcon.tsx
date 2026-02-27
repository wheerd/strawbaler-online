import type { IconProps } from './IconProps'

function RoofIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M7.5 2 L 13 11 H 2 Z" stroke="currentColor" strokeWidth="1" fill="none" />
      <path d="M 1 12 L 7.5 2 L 14 12" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  )
}

export default RoofIcon
