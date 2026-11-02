import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'strong'
export type ButtonSize = 'lg' | 'md'

const base =
  'inline-flex items-center justify-center gap-2.5 rounded-full font-semibold select-none transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
  'disabled:opacity-40 disabled:pointer-events-none'

const variants: Record<ButtonVariant, string> = {
  // Pressed state is Ripe Orange; text on yellow stays brown.
  primary: 'bg-accent text-on-accent active:bg-mark',
  secondary: 'border-[1.5px] border-line text-ink active:border-mark',
  text: 'text-ink active:text-mark',
  strong: 'bg-strong text-on-strong active:opacity-80',
}

const sizes: Record<ButtonSize, string> = {
  lg: 'min-h-14 px-6 text-[17px]',
  md: 'min-h-12 px-5 text-[15px]',
}

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'lg', extra = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  ref?: Ref<HTMLButtonElement>
}

export function Button({ variant, size, className = '', type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />
}

interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function ButtonLink({ variant, size, className = '', ...rest }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />
}
