import type { ReactNode } from 'react'
import type { Mark, MistakeType, TranscriptEntry } from '../call/types'

const typeLabel: Record<MistakeType, string> = {
  grammar: 'Grammar',
  vocab: 'Vocabulary',
  pronunciation: 'Pronunciation',
}

interface TranscriptBubbleProps {
  entry: TranscriptEntry
  marks?: Mark[]
  /** Mark ids that just landed: they get a short tint. */
  freshMarkIds?: Set<string>
  openMarkId?: string | null
  onOpenMark?: (mark: Mark) => void
  compact?: boolean
}

/** One turn of the call. Learner turns carry correction marks as underlines in place. */
export function TranscriptBubble({
  entry,
  marks = [],
  freshMarkIds,
  openMarkId,
  onOpenMark,
  compact = false,
}: TranscriptBubbleProps) {
  const mine = entry.role === 'me'
  const live = !entry.final
  return (
    <p
      lang="es"
      aria-live={live && mine ? 'polite' : undefined}
      className={`m-0 max-w-[84%] font-semibold ${compact ? 'px-3 py-2.5 text-[15px] leading-[1.55]' : 'px-3.5 py-3 text-[17px] leading-[1.6]'} ${
        mine
          ? 'self-end rounded-[20px_20px_6px_20px] bg-bubble-me'
          : 'self-start rounded-[20px_20px_20px_6px] bg-bubble-tutor'
      }`}
      style={
        mine
          ? {
              boxShadow: `inset 0 0 0 1px var(--bubble-me-line)${live ? ', 0 0 0 2px var(--accent)' : ''}`,
            }
          : undefined
      }
    >
      {renderWithMarks(entry.text, marks, freshMarkIds, openMarkId, onOpenMark)}
      {live && <span className="caret" aria-hidden="true" />}
    </p>
  )
}

function renderWithMarks(
  text: string,
  marks: Mark[],
  fresh: Set<string> | undefined,
  openId: string | null | undefined,
  onOpen: ((m: Mark) => void) | undefined,
): ReactNode[] {
  const sorted = [...marks].sort((a, b) => a.start - b.start)
  const out: ReactNode[] = []
  let cursor = 0
  for (const m of sorted) {
    if (m.start < cursor || m.end > text.length) continue
    if (m.start > cursor) out.push(text.slice(cursor, m.start))
    const cls = `mark mark-${m.type}${fresh?.has(m.id) ? ' mark-new' : ''}${openId === m.id ? ' mark-open' : ''}`
    out.push(
      <button
        key={m.id}
        type="button"
        className={cls}
        aria-expanded={openId === m.id}
        aria-label={`${typeLabel[m.type]} mark on ${m.phrase}. Show correction`}
        onClick={() => onOpen?.(m)}
      >
        {text.slice(m.start, m.end)}
      </button>,
    )
    cursor = m.end
  }
  if (cursor < text.length) out.push(text.slice(cursor))
  return out
}

/** Small line sample used in chips and legends: line style carries the error type, not just color. */
export function MarkSample({ type, width = 16 }: { type: MistakeType; width?: number }) {
  const style = type === 'grammar' ? 'solid' : type === 'vocab' ? 'dashed' : 'dotted'
  return (
    <span
      aria-hidden="true"
      className="inline-block"
      style={{ width, borderBottom: `${type === 'pronunciation' ? 3 : 2.5}px ${style} var(--mark)` }}
    />
  )
}

export { typeLabel }
