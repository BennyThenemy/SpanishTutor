import { BANDS, bandAtMost, lowerBand, vocabScreens, type Band, type Content, type Word } from '../content'

/**
 * The first-lesson placement (PLAN.md §1–4): two questions, vocabulary bubbles (path 1 only), then
 * the grammar ladder. Pure functions over a plain state object, so the state can be saved after
 * every answer and the test resumes on the same screen.
 */
export type Path = 'words' | 'speaking'
export type Platform = 'duolingo' | 'app' | 'other'
export type Screen = 'welcome' | 'q1' | 'q2' | 'vocab' | 'grammar' | 'results'

export interface PlacementState {
  screen: Screen
  path?: Path
  platform?: Platform
  /** Index into vocabScreens() of the bubble screen being shown. */
  vocabIndex: number
  /** Words tapped, by section. Includes the screen being shown, so taps survive a reload. */
  taps: Record<number, string[]>
  /** Last section passed; 0 if section 1 was not passed. */
  vocabSection: number
  /** Rung being asked, and the answers given on it so far (option index, -1 = "I don't know"). */
  rung: number
  answers: number[]
  /** Highest rung passed; 0 if none. */
  grammarRung: number
  /** Speaking path: the start rung they failed. The restart from rung 1 stops below it. */
  failedRung?: number
}

export const initialPlacement: PlacementState = {
  screen: 'welcome',
  vocabIndex: 0,
  taps: {},
  vocabSection: 0,
  rung: 0,
  answers: [],
  grammarRung: 0,
}

/** Fewer than this many taps out of 12 ends the vocab part. */
export const VOCAB_PASS = 4
/** 0–1 correct out of 3 ends the ladder. */
export const GRAMMAR_PASS = 2
export const DONT_KNOW = -1

export function start(s: PlacementState): PlacementState {
  return { ...s, screen: 'q1' }
}

export function answerPath(s: PlacementState, path: Path): PlacementState {
  return { ...s, path, screen: 'q2' }
}

export function answerPlatform(s: PlacementState, platform: Platform, c: Content): PlacementState {
  if (s.path === 'words') return { ...s, platform, screen: 'vocab', vocabIndex: 0 }
  return startLadder({ ...s, platform }, c)
}

export function toggleWord(s: PlacementState, c: Content, word: string): PlacementState {
  const { section } = vocabScreens(c)[s.vocabIndex]
  const current = s.taps[section] ?? []
  const next = current.includes(word) ? current.filter((w) => w !== word) : [...current, word]
  return { ...s, taps: { ...s.taps, [section]: next } }
}

/** Submit the bubble screen. `noneKnown` is the "I don't know any of these" button. */
export function submitVocab(s: PlacementState, c: Content, noneKnown = false): PlacementState {
  const screens = vocabScreens(c)
  const { section } = screens[s.vocabIndex]
  const taps = noneKnown ? [] : (s.taps[section] ?? [])
  const next = { ...s, taps: { ...s.taps, [section]: taps } }
  if (taps.length < VOCAB_PASS) return startLadder(next, c)
  next.vocabSection = section
  if (s.vocabIndex + 1 < screens.length) return { ...next, vocabIndex: s.vocabIndex + 1 }
  // Passed every screen: vocabIndex past the end marks them all as seen.
  return startLadder({ ...next, vocabIndex: screens.length }, c)
}

function startLadder(s: PlacementState, c: Content): PlacementState {
  const first = c.rungs[0].rung
  const rung = s.path === 'speaking' ? (c.rungs.find((r) => r.speakingPathStart)?.rung ?? first) : first
  return { ...s, screen: 'grammar', rung, answers: [] }
}

export function answerGrammar(s: PlacementState, c: Content, option: number): PlacementState {
  const rungs = c.rungs
  const i = rungs.findIndex((r) => r.rung === s.rung)
  const rung = rungs[i]
  const answers = [...s.answers, option]
  if (answers.length < rung.items.length) return { ...s, answers }

  const correct = answers.filter((a, k) => a === rung.items[k].answer).length
  if (correct >= GRAMMAR_PASS) {
    const passed = { ...s, answers: [], grammarRung: Math.max(s.grammarRung, rung.rung) }
    const next = rungs[i + 1]
    if (!next || next.rung === s.failedRung) return { ...passed, screen: 'results' }
    return { ...passed, rung: next.rung }
  }
  // Speaking path failed its start rung: go back to rung 1 once.
  if (s.path === 'speaking' && s.failedRung === undefined && s.grammarRung === 0 && i > 0) {
    return { ...s, answers: [], failedRung: rung.rung, rung: rungs[0].rung }
  }
  return { ...s, answers: [], screen: 'results' }
}

/** Progress through the whole test, 0–1, for the progress bar. Approximate: the test can end early. */
export function progress(s: PlacementState, c: Content): number {
  const screens = vocabScreens(c).length
  const rungs = c.rungs.length
  const total = (s.path === 'words' ? screens : 0) + rungs + 2
  const rungIndex = c.rungs.findIndex((r) => r.rung === s.rung)
  const rungItems = c.rungs[rungIndex]?.items.length || 1
  switch (s.screen) {
    case 'welcome':
      return 0
    case 'q1':
      return 0.5 / total
    case 'q2':
      return 1.5 / total
    case 'vocab':
      return (2 + s.vocabIndex) / total
    case 'grammar':
      return (2 + (s.path === 'words' ? screens : 0) + rungIndex + s.answers.length / rungItems) / total
    case 'results':
      return 1
  }
}

// ── Results ──

export interface PlacementResult {
  path: Path
  platform: Platform
  vocabSection: number
  grammarRung: number
  /** CEFR, internal only: never shown to the learner or said by Lucía. */
  level: Band
  /** Passed nothing: the first call is the "first 5 phrases" version. */
  beginner: boolean
  /** Path 1: the bubbles tapped. */
  tapped: string[]
  /** Path 1: bubbles not tapped on screens the learner saw. These start the vocabulary list. */
  missed: Word[]
  finishedAt: number
}

export function computeResult(s: PlacementState, c: Content): PlacementResult {
  const screens = vocabScreens(c)
  const vocabBand = screens.find((x) => x.section === s.vocabSection)?.band
  const grammarBand = c.rungs.find((r) => r.rung === s.grammarRung)?.band

  let level: Band
  if (s.path === 'speaking') level = grammarBand ?? 'A1'
  else level = vocabBand && grammarBand ? lowerBand(vocabBand, grammarBand) : 'A1'

  const seen = s.path === 'words' ? screens.slice(0, s.vocabIndex + 1) : []
  const tapped = seen.flatMap((x) => s.taps[x.section] ?? [])
  const missed = seen.flatMap((x) => x.words.filter((w) => !tapped.includes(w.word)))

  return {
    path: s.path ?? 'words',
    platform: s.platform ?? 'other',
    vocabSection: s.vocabSection,
    grammarRung: s.grammarRung,
    level,
    beginner: s.vocabSection === 0 && s.grammarRung === 0,
    tapped,
    missed,
    finishedAt: Date.now(),
  }
}

/** What Lucía gets as known words (PLAN.md §5). */
export function knownWords(r: PlacementResult, c: Content): string[] {
  if (r.path === 'words') return r.tapped
  return c.words.filter((w) => w.kind === 'word' && bandAtMost(w.band, r.level)).map((w) => w.word)
}

/**
 * Candidates for the call's "3 new words": the learner's not-known list, or, when that's empty
 * (speaking path, or every bubble tapped), words from the band above their level.
 */
export function newWordCandidates(r: PlacementResult, c: Content, limit = 40): Word[] {
  if (r.missed.length) return r.missed.slice(0, limit)
  const known = new Set(knownWords(r, c))
  const above = BANDS[Math.min(BANDS.indexOf(r.level) + 1, BANDS.length - 1)]
  return c.words.filter((w) => w.kind === 'word' && w.band === above && !known.has(w.word)).slice(0, limit)
}

/** Roughly where they'd be in the Duolingo course, for the results wording. */
export function duolingoSection(r: PlacementResult, c: Content): number {
  if (r.path === 'words') return r.vocabSection
  const sections = vocabScreens(c).filter((x) => bandAtMost(x.band, r.level))
  return r.grammarRung ? (sections.at(-1)?.section ?? 0) : 0
}
