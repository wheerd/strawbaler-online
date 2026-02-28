import type { IconProps } from './types'

function PrefabIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg width={width} height={height} viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="2" y="2" width="11" height="11" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4" y="4" width="7" height="7" fill="currentColor" fillOpacity={0.3} />
    </svg>
  )
}

export default PrefabIcon
