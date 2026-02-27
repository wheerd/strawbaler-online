import type { IconProps } from './IconProps'

function MonolithicIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="2" y="5" width="11" height="5" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

export default MonolithicIcon
