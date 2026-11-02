export type MistakeType = 'grammar' | 'vocab' | 'pronunciation'

/** A correction anchored to a span of one of the learner's transcript entries. */
export interface Mark {
  id: string
  entryId: string
  /** Character offsets into the entry's text. Text only ever grows, so these stay valid. */
  start: number
  end: number
  type: MistakeType
  phrase: string
  correction: string
  explanation: string
  /** Same explanation in Hebrew, when the help language is Hebrew. */
  explanationHe?: string
  /** Times this phrase has been marked across calls, including this one. */
  seen: number
  createdAt: number
}

export interface TranscriptEntry {
  id: string
  role: 'tutor' | 'me'
  text: string
  /** False while the speaker is still talking. */
  final: boolean
}

export type CallPhase = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'ended' | 'error'

/** Who currently has the floor, for the header status and the live bubble. */
export type Floor = 'tutor' | 'me' | 'none'

export interface CallSnapshot {
  phase: CallPhase
  floor: Floor
  entries: TranscriptEntry[]
  marks: Mark[]
  muted: boolean
  speakerOn: boolean
  pushToTalk: boolean
  talking: boolean
  /** 0–1 microphone level, for the level bars. */
  micLevel: number
  elapsedMs: number
  error?: string
}
