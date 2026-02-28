import type { IconProps } from './types'

function LShape90Icon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M7.5 2 H 13 V 13 H 2 V 7.5 H 7.5 Z" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

export default LShape90Icon
