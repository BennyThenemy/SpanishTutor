import { useEffect, useRef } from 'react'
import type { Mark } from '../call/types'
import { Button } from './Button'
import { Icon } from './Icon'
import { MarkSample, typeLabel } from './TranscriptBubble'

interface CorrectionSheetProps {
  mark: Mark
  /** Text of the learner turn the mark sits in, for "You said". */
  context: string
  onClose: () => void
  onHear: (text: string) => void
}

/**
 * Bottom sheet for one mark. It sits below the transcript (the call layout gives it its own
 * space) so the transcript stays visible and the call keeps running.
 */
export function CorrectionSheet({ mark, context, onClose, onHear }: CorrectionSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const said = snippetAround(context, mark.start, mark.end)

  return (
    <section
      role="dialog"
      aria-label={`Correction for ${mark.phrase}`}
      className="pb-safe flex flex-col gap-3.5 rounded-t-[30px] bg-card px-5 pt-2.5"
    >
      <div aria-hidden="true" className="h-[5px] w-10 self-center rounded-full bg-line" />
      <div className="flex items-center gap-2">
        <span className="inline-flex h-[30px] items-center gap-2 rounded-full bg-bg px-3 text-[13px] font-bold">
          <MarkSample type={mark.type} />
          {typeLabel[mark.type]}
        </span>
        <span className="flex-1" />
        {mark.seen > 1 && (
          <span className="flex items-baseline gap-1.5">
            <span className="text-[13px] font-semibold text-muted">seen</span>
            <span className="text-xl font-extrabold">×{mark.seen}</span>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted">You said</span>
        <p lang="es" className="m-0 text-[17px] font-semibold leading-normal">
          {said.before}
          <span className={`mark mark-${mark.type}`} style={{ cursor: 'default' }}>
            {said.phrase}
          </span>
          {said.after}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted">Say</span>
        <p lang="es" className="m-0 text-[22px] font-extrabold leading-snug">
          <mark className="rounded-md bg-accent px-1 text-on-accent">{mark.correction}</mark>
        </p>
      </div>

      <p className="m-0 text-[15px] font-medium leading-normal">{mark.explanation}</p>

      <div className="mt-1 grid grid-cols-2 gap-2.5">
        <Button variant="secondary" size="md" onClick={() => onHear(mark.correction)}>
          <Icon name="speakerLow" size={20} />
          Hear it
        </Button>
        <Button ref={closeRef} size="md" onClick={onClose}>
          Got it
        </Button>
      </div>
    </section>
  )
}

function snippetAround(text: string, start: number, end: number) {
  const from = Math.max(0, text.lastIndexOf(' ', Math.max(0, start - 28)))
  const to = text.indexOf(' ', Math.min(text.length, end + 24))
  const stop = to === -1 ? text.length : to
  return {
    before: (from > 0 ? '…' : '') + text.slice(from, start).trimStart(),
    phrase: text.slice(start, end),
    after: text.slice(end, stop) + (stop < text.length ? '…' : ''),
  }
}
