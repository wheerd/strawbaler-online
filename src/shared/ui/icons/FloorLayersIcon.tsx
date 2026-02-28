import type { IconProps } from './types'

function FloorLayersIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M1.5 4 H 13.5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M2.5 7 H 12.5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" opacity="0.8" />
      <path d="M3.5 10 H 11.5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />
      <path d="M4.5 13 H 10.5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

export default FloorLayersIcon
