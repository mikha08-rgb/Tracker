interface IconProps {
  className?: string
}

function base(className?: string) {
  return {
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: className ?? 'size-4',
  }
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M8 3.25v9.5M3.25 8h9.5" />
    </svg>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="m3.25 8.5 3.25 3 6.25-7" />
    </svg>
  )
}

export function MinusIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M3.25 8h9.5" />
    </svg>
  )
}

export function PencilIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="m11.1 2.6 2.3 2.3L6 12.3l-3 .7.7-3 7.4-7.4Z" />
    </svg>
  )
}

export function SlidersIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M2.5 4.5h5M10.5 4.5h3M2.5 11.5h3M8.5 11.5h5" />
      <circle cx="9" cy="4.5" r="1.5" />
      <circle cx="7" cy="11.5" r="1.5" />
    </svg>
  )
}

export function SunIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M12.6 3.4l-1 1M4.4 11.6l-1 1" />
    </svg>
  )
}

export function MoonIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7Z" />
    </svg>
  )
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M9.75 3.5 5.25 8l4.5 4.5" />
    </svg>
  )
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="m6.25 3.5 4.5 4.5-4.5 4.5" />
    </svg>
  )
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="m3.75 3.75 8.5 8.5M12.25 3.75l-8.5 8.5" />
    </svg>
  )
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M8 2.5v7M5 6.75 8 9.5l3-2.75M2.75 12.25h10.5" />
    </svg>
  )
}

export function UploadIcon({ className }: IconProps) {
  return (
    <svg {...base(className)}>
      <path d="M8 9.5v-7M5 5.25 8 2.5l3 2.75M2.75 12.25h10.5" />
    </svg>
  )
}

/** The 2×2 tile mark from the favicon, for the header wordmark. */
export function LogoIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className ?? 'size-5'}>
      <rect x="2" y="2" width="13" height="13" rx="3.5" fill="#22c55e" fillOpacity=".35" />
      <rect x="17" y="2" width="13" height="13" rx="3.5" fill="#22c55e" fillOpacity=".6" />
      <rect x="2" y="17" width="13" height="13" rx="3.5" fill="#22c55e" fillOpacity=".85" />
      <rect x="17" y="17" width="13" height="13" rx="3.5" fill="#22c55e" />
    </svg>
  )
}
