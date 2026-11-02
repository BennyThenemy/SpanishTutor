/**
 * The tutor and the daily call's plan. Hard-coded for the MVP; later this comes from Firestore
 * (memory across sessions, schedule, uploaded books). The learner lives in ./learner.ts.
 */
export const tutor = { name: 'Lucía', voice: 'Kore' }

export const today = {
  nextCall: '18:30',
  minutes: 10,
  focusTitle: 'Si-clauses with the imperfect subjunctive',
  focusShort: 'si-clauses',
  focusDetail: 'Hypotheticals: “si tuviera…, iría…” — not “si tendría”.',
  focusSource: 'Built-in grammar notes',
}

export const MAX_CALL_MS = 15 * 60 * 1000

const SEEN_KEY = 'hablemos.seen'

/** How many times a phrase has been marked, across calls. Stored on this device only. */
export function bumpSeen(phrase: string): number {
  const key = phrase.trim().toLocaleLowerCase('es')
  let counts: Record<string, number> = {}
  try {
    counts = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '{}')
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  counts[key] = (counts[key] ?? 0) + 1
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(counts))
  } catch {
    /* private mode: counts just won't persist */
  }
  return counts[key]
}
