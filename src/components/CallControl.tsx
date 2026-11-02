import type { ButtonHTMLAttributes } from 'react'
import { Icon, type IconName } from './Icon'

interface CallControlProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName
  label: string
  /** 'on' fills yellow (an active toggle), 'end' fills brown/cream. */
  tone?: 'default' | 'on' | 'end'
  size?: number
}

/** Round 64px call button with a label underneath. */
export function CallControl({ icon, label, tone = 'default', size = 64, className = '', ...rest }: CallControlProps) {
  const fill =
    tone === 'on' ? 'bg-accent text-on-accent' : tone === 'end' ? 'bg-strong text-on-strong' : 'bg-card text-ink'
  return (
    <button
      type="button"
      className={`flex flex-col items-center gap-1.5 text-xs font-semibold text-ink disabled:opacity-40 ${className}`}
      {...rest}
    >
      <span
        className={`flex items-center justify-center rounded-full transition-colors active:brightness-90 ${fill}`}
        style={{ width: size, height: size }}
      >
        <Icon name={icon} size={26} />
      </span>
      {label}
    </button>
  )
}
