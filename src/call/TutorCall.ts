import { getLiveGenerativeModel, ResponseModality, type LiveSession } from 'firebase/ai'
import { getFirebaseAI, LIVE_MODEL, takeServerCloseReason } from '../lib/firebase'
import { bumpSeen, MAX_CALL_MS, tutor } from '../lib/profile'
import { MicCapture, PcmPlayer, SILENCE_CHUNK, type MicChunk } from './audio'
import { checkSegment } from './checker'
import type { CallPlan } from './plan'
import type { CallSnapshot, Floor, Mark, TranscriptEntry } from './types'

const MIC_VOICE_RMS = 0.02
const RETRY_WINDOW_MS = 30_000

type Listener = () => void

/**
 * One phone call with the tutor: a Gemini Live session for voice and transcripts, plus a
 * text model that marks mistakes in the learner's speech as it's transcribed.
 */
export class TutorCall {
  constructor(private plan: CallPlan) {}

  private listeners = new Set<Listener>()
  private snap: CallSnapshot = {
    phase: 'idle',
    floor: 'none',
    entries: [],
    marks: [],
    muted: false,
    speakerOn: true,
    pushToTalk: false,
    talking: false,
    micLevel: 0,
    elapsedMs: 0,
  }

  private session?: LiveSession
  private mic?: MicCapture
  private player?: PcmPlayer
  private wakeLock?: WakeLockSentinel
  private timer?: number
  private startedAt = 0
  private pausedMs = 0
  private pausedAt = 0
  private lastVoiceAt = 0
  private ending = false
  private demo = false
  private seq = 0
  private dropAt = 0
  private retryTimer?: number

  /** Per learner-entry checker progress. */
  private checks = new Map<string, { checkedTo: number; debounce?: number }>()

  // ── store API for useSyncExternalStore ──
  subscribe = (l: Listener) => {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }
  getSnapshot = () => this.snap

  private set(patch: Partial<CallSnapshot>) {
    this.snap = { ...this.snap, ...patch }
    this.listeners.forEach((l) => l())
  }

  // ── lifecycle ──

  /** Call from the Accept tap: audio playback has to be unlocked inside a user gesture. */
  async start() {
    if (this.snap.phase !== 'idle') return
    this.player = new PcmPlayer()
    const unlocked = this.player.unlock()
    this.player.onPlayingChange = () => this.updateFloor()
    this.set({ phase: 'connecting' })
    try {
      await unlocked
      await this.connect()
      this.mic = new MicCapture()
      await this.mic.start(this.onMic)
      this.startedAt = performance.now()
      this.timer = window.setInterval(this.tick, 250)
      window.addEventListener('offline', this.onOffline)
      document.addEventListener('visibilitychange', this.onVisibility)
      void this.keepAwake()
      this.set({ phase: 'live' })
      // Like a real call, the tutor says hello first.
      await this.session?.send('(The learner just answered your call. Greet them and start the conversation.)', true)
    } catch (e) {
      await this.teardown()
      this.set({ phase: 'error', error: describeError(e) })
    }
  }

  async end() {
    // Nothing to hang up before Accept (this also keeps React StrictMode's dev remount harmless).
    if (this.ending || this.snap.phase === 'idle' || this.demo) return
    this.ending = true
    this.finalizeOpen()
    await this.teardown()
    this.set({ phase: this.snap.phase === 'error' ? 'error' : 'ended', floor: 'none', micLevel: 0 })
  }

  setMuted(muted: boolean) {
    this.set({ muted })
  }
  setSpeaker(speakerOn: boolean) {
    // The web can't pick earpiece vs loudspeaker, so "speaker off" plays the tutor quietly.
    this.player?.setVolume(speakerOn ? 1 : 0.3)
    this.set({ speakerOn })
  }
  setPushToTalk(pushToTalk: boolean) {
    this.set({ pushToTalk, talking: false })
  }
  setTalking(talking: boolean) {
    if (talking) this.player?.flush()
    this.set({ talking })
  }

  /** Reconnect after a dropped connection, carrying the recent conversation over. */
  async retry() {
    if (this.snap.phase !== 'reconnecting') return
    window.clearTimeout(this.retryTimer)
    try {
      await this.session?.close().catch(() => {})
      await this.connect()
      this.resumeClock()
      this.set({ phase: 'live' })
      const recap = this.snap.entries
        .slice(-8)
        .map((e) => `${e.role === 'me' ? 'Learner' : tutor.name}: ${e.text}`)
        .join('\n')
      await this.session?.send(
        `(The call dropped for a moment and reconnected. Recent conversation:\n${recap}\nApologise briefly and carry on.)`,
        true,
      )
    } catch {
      this.scheduleRetry()
    }
  }

  /** Dev-only static snapshot of a call in progress (no audio, no network). */
  loadDemo() {
    this.demo = true
    const me1 = 'Bien, gracias. El lunes quería aplicar para un trabajo nuevo.'
    const me2 = 'Mmm… si yo tendría un mes libre, iría a Oaxaca porque me gusta mucho la comida y'
    const mark = (entryId: string, text: string, phrase: string, rest: Omit<Mark, 'id' | 'entryId' | 'start' | 'end' | 'phrase'>): Mark => {
      const start = text.indexOf(phrase)
      return { id: `m${++this.seq}`, entryId, start, end: start + phrase.length, phrase, ...rest }
    }
    this.set({
      phase: 'live',
      floor: 'me',
      micLevel: 0.05,
      elapsedMs: 7 * 60_000 + 4_000,
      entries: [
        { id: 'd1', role: 'tutor', text: '¡Hola! ¿Qué tal tu semana?', final: true },
        { id: 'd2', role: 'me', text: me1, final: true },
        { id: 'd3', role: 'tutor', text: '¡Qué bien! Por cierto, decimos solicitar un trabajo. Ahora dime: si tuvieras un mes libre, ¿adónde irías?', final: true },
        { id: 'd4', role: 'me', text: me2, final: false },
      ],
      marks: [
        mark('d2', me1, 'aplicar', {
          type: 'vocab',
          correction: 'solicitar un trabajo',
          explanation: '“Aplicar” is for rules or creams. For jobs, use solicitar.',
          seen: 1,
          createdAt: Date.now() - 60_000,
        }),
        mark('d4', me2, 'tendría', {
          type: 'grammar',
          correction: 'si yo tuviera un mes libre',
          explanation: 'After si in a hypothetical, use the imperfect subjunctive. The conditional goes in the other half: iría.',
          seen: 3,
          createdAt: Date.now(),
        }),
      ],
    })
  }

  // ── session ──

  private async connect() {
    const model = getLiveGenerativeModel(getFirebaseAI(), {
      model: LIVE_MODEL,
      systemInstruction: this.plan.systemInstruction,
      generationConfig: {
        responseModalities: [ResponseModality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: tutor.voice } } },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    })
    const session = await model.connect()
    this.session = session
    void this.receive(session)
  }

  private async receive(session: LiveSession) {
    try {
      for await (const msg of session.receive()) {
        if (msg.type === 'serverContent') {
          if (msg.interrupted) {
            this.player?.flush()
            this.finalizeLast('tutor')
          }
          for (const part of msg.modelTurn?.parts ?? []) {
            if ('inlineData' in part && part.inlineData?.mimeType.startsWith('audio/')) {
              this.player?.enqueue(part.inlineData.data, part.inlineData.mimeType)
            }
          }
          if (msg.inputTranscription?.text) this.appendSpeech('me', msg.inputTranscription.text)
          if (msg.outputTranscription?.text) this.appendSpeech('tutor', msg.outputTranscription.text)
          if (msg.turnComplete) this.finalizeLast('tutor')
        } else if (msg.type === 'goingAwayNotice') {
          // The server is about to close the socket; the drop handler takes it from there.
        }
      }
    } catch {
      /* socket error: handled as a drop below */
    }
    if (session === this.session && !this.ending && this.snap.phase === 'live') this.onDrop()
  }

  private onMic = (chunk: MicChunk) => {
    const { phase, muted, pushToTalk, talking } = this.snap
    const open = !muted && (!pushToTalk || talking)
    if (open && chunk.rms > MIC_VOICE_RMS) this.lastVoiceAt = performance.now()
    if (phase === 'live' && this.session && !this.session.isClosed) {
      this.session
        .sendAudioRealtime({ mimeType: 'audio/pcm;rate=16000', data: open ? chunk.base64 : SILENCE_CHUNK })
        .catch(() => {})
    }
    this.snap = { ...this.snap, micLevel: open ? chunk.rms : 0 }
    this.updateFloor(true)
  }

  private updateFloor(force = false) {
    const floor: Floor = this.player?.playing
      ? 'tutor'
      : performance.now() - this.lastVoiceAt < 700
        ? 'me'
        : 'none'
    if (force || floor !== this.snap.floor) this.set({ floor })
  }

  // ── transcript ──

  private appendSpeech(role: 'me' | 'tutor', text: string) {
    const entries = this.snap.entries
    let last = entries[entries.length - 1]
    if (role === 'tutor' || last?.role !== role) this.finalizeLast(role === 'me' ? 'tutor' : 'me')
    last = this.snap.entries[this.snap.entries.length - 1]

    let next: TranscriptEntry[]
    let entry: TranscriptEntry
    if (last && last.role === role && !last.final) {
      entry = { ...last, text: last.text + text }
      next = [...this.snap.entries.slice(0, -1), entry]
    } else {
      entry = { id: `e${++this.seq}`, role, text: text.trimStart(), final: false }
      next = [...this.snap.entries, entry]
    }
    this.set({ entries: next })
    if (role === 'me') this.scheduleCheck(entry)
  }

  /** Close the latest entry if it belongs to `role` and is still open. */
  private finalizeLast(role: 'me' | 'tutor') {
    const entries = this.snap.entries
    const last = entries[entries.length - 1]
    if (!last || last.role !== role || last.final) return
    const done = { ...last, final: true }
    this.set({ entries: [...entries.slice(0, -1), done] })
    if (role === 'me') this.runCheck(done)
  }

  private finalizeOpen() {
    this.finalizeLast('me')
    this.finalizeLast('tutor')
  }

  // ── live corrections ──

  private scheduleCheck(entry: TranscriptEntry) {
    const state = this.checks.get(entry.id) ?? { checkedTo: 0 }
    this.checks.set(entry.id, state)
    window.clearTimeout(state.debounce)
    const pending = entry.text.slice(state.checkedTo)
    const words = pending.trim().split(/\s+/).filter(Boolean).length
    // Check at a clause boundary, or after a short lull in the transcript.
    if (words >= 4 && /[.,;:?!]\s*\S*$/.test(pending)) this.runCheck(entry)
    else state.debounce = window.setTimeout(() => this.runCheck(this.entryById(entry.id) ?? entry), 900)
  }

  private runCheck(entry: TranscriptEntry) {
    const state = this.checks.get(entry.id) ?? { checkedTo: 0 }
    this.checks.set(entry.id, state)
    window.clearTimeout(state.debounce)
    const from = state.checkedTo
    const segment = entry.text.slice(from)
    if (segment.trim().split(/\s+/).filter(Boolean).length < (entry.final ? 1 : 3)) return
    state.checkedTo = entry.text.length

    checkSegment(this.plan.level, entry.text, segment)
      .then((findings) => {
        const current = this.entryById(entry.id)
        if (!current) return
        const added: Mark[] = []
        for (const f of findings) {
          const at = locate(current.text, f.phrase, Math.max(0, from - 40))
          if (at < 0) continue
          const end = at + f.phrase.length
          const overlaps = [...this.snap.marks, ...added].some(
            (m) => m.entryId === entry.id && at < m.end && end > m.start,
          )
          if (overlaps) continue
          added.push({
            id: `m${++this.seq}`,
            entryId: entry.id,
            start: at,
            end,
            type: f.type,
            phrase: current.text.slice(at, end),
            correction: f.correction,
            explanation: f.explanation,
            seen: bumpSeen(f.phrase),
            createdAt: Date.now(),
          })
        }
        if (added.length) this.set({ marks: [...this.snap.marks, ...added] })
      })
      .catch((e) => console.warn('Mistake check failed', e))
  }

  private entryById(id: string) {
    return this.snap.entries.find((e) => e.id === id)
  }

  // ── connection loss ──

  private onOffline = () => {
    if (this.snap.phase === 'live') this.onDrop()
  }

  private onDrop() {
    this.player?.flush()
    this.finalizeOpen()
    this.pausedAt = performance.now()
    this.dropAt = Date.now()
    this.set({ phase: 'reconnecting', floor: 'none', micLevel: 0 })
    this.scheduleRetry()
  }

  private scheduleRetry() {
    if (Date.now() - this.dropAt > RETRY_WINDOW_MS) return
    this.retryTimer = window.setTimeout(() => void this.retry(), navigator.onLine ? 2000 : 5000)
  }

  private resumeClock() {
    if (this.pausedAt) this.pausedMs += performance.now() - this.pausedAt
    this.pausedAt = 0
  }

  private tick = () => {
    if (this.snap.phase !== 'live') return
    const elapsedMs = performance.now() - this.startedAt - this.pausedMs
    this.set({ elapsedMs })
    if (elapsedMs >= MAX_CALL_MS) void this.end()
  }

  // ── screen wake lock ──

  private async keepAwake() {
    try {
      this.wakeLock = await navigator.wakeLock?.request('screen')
    } catch {
      /* not supported or not visible: the call still works */
    }
  }

  private onVisibility = () => {
    if (document.visibilityState === 'visible' && !this.ending) void this.keepAwake()
  }

  private async teardown() {
    window.clearInterval(this.timer)
    window.clearTimeout(this.retryTimer)
    for (const s of this.checks.values()) window.clearTimeout(s.debounce)
    window.removeEventListener('offline', this.onOffline)
    document.removeEventListener('visibilitychange', this.onVisibility)
    await this.mic?.stop()
    await this.session?.close().catch(() => {})
    await this.player?.close()
    await this.wakeLock?.release().catch(() => {})
    this.mic = this.session = this.player = this.wakeLock = undefined
  }
}

/** Case-insensitive search for the checker's phrase, starting near the checked segment. */
function locate(text: string, phrase: string, from: number) {
  const hay = text.toLocaleLowerCase('es')
  const needle = phrase.trim().toLocaleLowerCase('es')
  const at = hay.indexOf(needle, from)
  return at >= 0 ? at : hay.indexOf(needle)
}

function describeError(e: unknown): string {
  if (e instanceof DOMException && e.name === 'NotAllowedError') {
    return 'Microphone access was blocked. Allow it in your browser settings and try again.'
  }
  if (e instanceof DOMException && e.name === 'NotFoundError') return 'No microphone found on this device.'
  const reason = takeServerCloseReason()
  if (reason && /not been used|disabled/i.test(reason)) {
    return 'Firebase AI Logic is not enabled for this Firebase project. In the Firebase console, open AI Logic, choose Get started with the Gemini Developer API, then wait a minute and try again.'
  }
  if (reason && /app check/i.test(reason)) {
    // The SDK's Live WebSocket sends only the API key, never an App Check token, so a debug token can't help here.
    return 'Firebase App Check rejected the call. Live voice calls cannot send an App Check token, so turn off App Check enforcement for Firebase AI Logic (Firebase console → App Check → APIs).'
  }
  if (reason) return `The server refused the call: ${reason}`
  if (e instanceof Error) return e.message
  return 'The call could not start.'
}
