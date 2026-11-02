interface AvatarProps {
  name: string
  size?: number
  /** Yellow ring while the tutor is speaking. */
  speaking?: boolean
  dimmed?: boolean
}

export function Avatar({ name, size = 48, speaking = false, dimmed = false }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold ${
        dimmed ? 'border-[1.5px] border-dashed border-line bg-sunk text-muted' : 'bg-accent text-on-accent'
      }`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        boxShadow: speaking ? '0 0 0 3px var(--bg), 0 0 0 6px var(--accent)' : undefined,
      }}
    >
      {name.charAt(0)}
    </span>
  )
}
