import type { IconProps } from './types'

function ModulesIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 1 15.5 14.5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="2" y="2" width="3.5" height="12.5" stroke="currentColor" strokeWidth="0.5" />

      <rect x="6" y="2" width="3.5" height="12.5" stroke="currentColor" strokeWidth="0.5" />

      <rect x="10" y="2" width="3.5" height="12.5" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  )
}

export default ModulesIcon
