import { useSyncExternalStore } from 'react'
import { getContent } from '../content'
import { computeResult, initialPlacement, type PlacementResult, type PlacementState } from '../placement/engine'

/**
 * Everything the app knows about the learner. Stored on this device only for now (localStorage);
 * the shape maps onto a Firestore `learners/{uid}` document for the move later.
 */
export interface VocabEntry {
  word: string
  translation: string
  addedAt: number
}

export interface Learner {
  targetLanguage: string
  /** The placement in progress. Kept after it finishes, but not used again (no retakes in v1). */
  placement: PlacementState
  result?: PlacementResult
  vocab: VocabEntry[]
  /** Picked "Call now" or "Call later" on the results screen: the placement is behind them. */
  onboarded: boolean
  /** "Call later": when to show the next call on Home. Epoch ms. */
  nextCall?: number
  firstCallDone: boolean
}

const KEY = 'hablemos.learner'

const fresh = (): Learner => ({ targetLanguage: 'es', placement: initialPlacement, vocab: [], onboarded: false, firstCallDone: false })

function load(): Learner {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...fresh(), ...(JSON.parse(raw) as Partial<Learner>) }
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  return fresh()
}

let state = load()
const listeners = new Set<() => void>()

function save(next: Learner) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* private mode: progress just won't persist */
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const getLearner = () => state
export const useLearner = () => useSyncExternalStore(subscribe, getLearner)

export function setPlacement(placement: PlacementState) {
  if (placement.screen !== 'results' || state.result) return save({ ...state, placement })
  // Finished: fix the result and start the vocabulary list with the words they didn't tap.
  const result = computeResult(placement, getContent(state.targetLanguage))
  const have = new Set(state.vocab.map((v) => v.word))
  const added = result.missed
    .filter((w) => !have.has(w.word))
    .map((w) => ({ word: w.word, translation: w.translation, addedAt: result.finishedAt }))
  save({ ...state, placement, result, vocab: [...state.vocab, ...added] })
}

/** Leave the results screen: "Call now" (no time) or "Call later" (the time picked). */
export function finishOnboarding(nextCall?: number) {
  save({ ...state, onboarded: true, nextCall })
}

export function markFirstCallDone() {
  if (!state.firstCallDone) save({ ...state, firstCallDone: true, nextCall: undefined })
}

/** Dev only: start over. */
export function resetLearner() {
  save(fresh())
}
