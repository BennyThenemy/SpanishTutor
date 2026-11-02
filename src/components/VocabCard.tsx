import { Icon } from './Icon'

interface VocabCardProps {
  word: string
  meaning?: string
  example?: string
  /** 0–4 */
  strength?: number
  onHear?: () => void
}

export function VocabCard({ word, meaning, example, strength = 0, onHear }: VocabCardProps) {
  return (
    <article className="flex flex-col gap-2.5 rounded-[26px] bg-card p-5">
      <div className="flex items-start gap-2.5">
        <span lang="es" className="flex-1 text-[28px] font-extrabold tracking-tight">
          {word}
        </span>
        {onHear && (
          <button
            type="button"
            onClick={onHear}
            aria-label={`Hear ${word}`}
            className="flex size-12 items-center justify-center rounded-full bg-bg text-ink"
          >
            <Icon name="speakerLow" size={22} />
          </button>
        )}
      </div>
      {meaning && <span className="text-[15px] font-semibold">{meaning}</span>}
      {example && (
        <span lang="es" className="text-sm font-medium text-muted">
          «{example}»
        </span>
      )}
      <span role="img" aria-label={`Strength ${strength} of 4`} className="flex gap-[3px]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 w-[18px] rounded-full ${i < strength ? 'bg-accent' : 'bg-line'}`} />
        ))}
      </span>
    </article>
  )
}
