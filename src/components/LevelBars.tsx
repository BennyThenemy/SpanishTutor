interface LevelBarsProps {
  /** 0–1. When undefined the bars animate on their own (tutor speaking). */
  level?: number
  color?: string
}

const shape = [0.45, 0.85, 1, 0.65, 0.35]

/** Five small bars: tutor speech waveform or the learner's mic level. */
export function LevelBars({ level, color = 'var(--accent)' }: LevelBarsProps) {
  return (
    <span aria-hidden="true" className="flex h-3.5 items-center gap-0.5">
      {shape.map((s, i) => (
        <span
          key={i}
          className={level === undefined ? 'animate-level' : ''}
          style={{
            width: 3,
            height: 14,
            borderRadius: 2,
            background: color,
            transformOrigin: 'center',
            transform: level === undefined ? undefined : `scaleY(${Math.max(0.2, Math.min(1, level * 2.2 * s))})`,
            animation: level === undefined ? `level ${0.7 + i * 0.13}s ease-in-out ${i * 0.08}s infinite` : undefined,
            transition: 'transform 80ms linear',
          }}
        />
      ))}
    </span>
  )
}
