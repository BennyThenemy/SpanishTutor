import es from './es.json'

/**
 * Placement content, built from db/*.sql by `npm run content`. One file per target language;
 * adding a language means adding rows to the SQL and a line to `byLanguage`.
 */
export type Band = 'A1' | 'A2' | 'B1' | 'B2'
export const BANDS: Band[] = ['A1', 'A2', 'B1', 'B2']

export interface Word {
  word: string
  /** English: the only help language for now. */
  translation: string
  band: Band
  section: number
  kind: 'word' | 'sentence' | 'pattern'
  /** Shown as a bubble in the placement test. */
  placement?: boolean
}

export interface GrammarItem {
  /** `___` marks the blank. */
  prompt: string
  options: string[]
  answer: number
}

export interface Rung {
  rung: number
  topic: string
  /** Level reached by passing this rung. */
  band: Band
  speakingPathStart?: boolean
  items: GrammarItem[]
}

export interface Content {
  language: string
  words: Word[]
  rungs: Rung[]
}

const byLanguage: Record<string, Content> = { es: es as Content }

export function getContent(language: string): Content {
  const c = byLanguage[language]
  if (!c) throw new Error(`No placement content for language "${language}"`)
  return c
}

export interface VocabScreen {
  section: number
  band: Band
  words: Word[]
}

/** One bubble screen per section that has placement words, in section order. */
export function vocabScreens(c: Content): VocabScreen[] {
  const screens = new Map<number, VocabScreen>()
  for (const w of c.words) {
    if (!w.placement) continue
    let s = screens.get(w.section)
    if (!s) screens.set(w.section, (s = { section: w.section, band: w.band, words: [] }))
    s.words.push(w)
  }
  return [...screens.values()].sort((a, b) => a.section - b.section)
}

export const bandAtMost = (band: Band, max: Band) => BANDS.indexOf(band) <= BANDS.indexOf(max)
export const lowerBand = (a: Band, b: Band) => (BANDS.indexOf(a) <= BANDS.indexOf(b) ? a : b)
