import type { IconProps } from './types'

function StrawbaleIcon({ width = 15, height = 15, ...props }: IconProps): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      height={height}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 9 12 6 18 9 12 12 6 9Z" />
      <path d="M6 9v6l6 3v-6L6 9Z" />
      <path d="M18 9v6l-6 3v-6l6-3Z" />
      <path d="M8.5 7.3v6.7" />
      <path d="M15.5 8.3v6.7" />
      <path d="M6 12.2l6 2.9 6-2.9" />
      <path d="M9 15.1l-3-.9" />
      <path d="m15 15.1 3-.9" />
    </svg>
  )
}

export default StrawbaleIcon
