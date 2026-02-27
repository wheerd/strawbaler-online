import type { IconProps } from './types'

function MidCutXIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M1 1 H 7.5 V 14 H 1Z" stroke="currentColor" strokeWidth="1" />
      <path d="M7.5 1 H 14 V 14 H 7.5Z" stroke="currentColor" strokeWidth="1" strokeDasharray="1 1" />
    </svg>
  )
}

export default MidCutXIcon
