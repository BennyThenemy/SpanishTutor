import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { TutorCall } from '../call/TutorCall'
import type { CallSnapshot, Mark } from '../call/types'
import { Avatar } from '../components/Avatar'
import { Button, ButtonLink } from '../components/Button'
import { CallControl } from '../components/CallControl'
import { CorrectionSheet } from '../components/CorrectionSheet'
import { Icon } from '../components/Icon'
import { LevelBars } from '../components/LevelBars'
import { MarkSample, TranscriptBubble, typeLabel } from '../components/TranscriptBubble'
import { MAX_CALL_MS, today, tutor } from '../lib/profile'

const FRESH_MS = 2500
const NEW_CHIP_MS = 6000

export function Call() {
  const [call] = useState(() => {
    const c = new TutorCall()
    // Dev only: /call?demo shows a mid-call transcript without Firebase, for layout work.
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('demo')) c.loadDemo()
    return c
  })
  const snap = useSyncExternalStore(call.subscribe, call.getSnapshot)

  useEffect(() => () => void call.end(), [call])

  if (snap.phase === 'idle') return <Incoming onAccept={() => void call.start()} />
  if (snap.phase === 'error') return <CallError message={snap.error} />
  if (snap.phase === 'ended') return <CallEnded snap={snap} />
  return <InCall call={call} snap={snap} />
}

// ── Incoming: also the user gesture that unlocks audio ──

function Incoming({ onAccept }: { onAccept: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="pt-safe pb-safe flex h-full flex-col bg-card">
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6">
        <div aria-hidden="true" className="flex size-[220px] items-center justify-center rounded-full border-[1.5px] border-line">
          <div className="flex size-[180px] items-center justify-center rounded-full border-[1.5px] border-line">
            <Avatar name={tutor.name} size={136} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <h1 className="m-0 text-[38px] font-extrabold tracking-tight">{tutor.name}</h1>
          <span className="text-base font-medium text-muted">Your daily call · about {today.minutes} min</span>
        </div>
        <span className="inline-flex h-9 items-center rounded-full bg-bg px-4 text-sm font-semibold">
          Today: {today.focusShort}
        </span>
      </div>
      <div className="flex justify-between px-10 pb-6">
        <CallControl icon="phoneDown" label="Decline" tone="end" size={76} className="text-sm" onClick={() => navigate('/')} />
        <CallControl
          icon="phone"
          label="Accept"
          tone="on"
          size={76}
          className="text-sm [&>span]:shadow-[0_0_0_8px_rgb(242_169_0/0.25)]"
          onClick={onAccept}
        />
      </div>
    </div>
  )
}

// ── In call ──

function InCall({ call, snap }: { call: TutorCall; snap: CallSnapshot }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const openMark = snap.marks.find((m) => m.id === openId) ?? null
  const now = Date.now()
  const fresh = useMemo(
    () => new Set(snap.marks.filter((m) => now - m.createdAt < FRESH_MS).map((m) => m.id)),
    [snap.marks, now],
  )
  const marksByEntry = useMemo(() => {
    const map = new Map<string, Mark[]>()
    for (const m of snap.marks) map.set(m.entryId, [...(map.get(m.entryId) ?? []), m])
    return map
  }, [snap.marks])

  const close = useCallback(() => setOpenId(null), [])
  const reconnecting = snap.phase === 'reconnecting'

  return (
    <div className="flex h-full flex-col">
      <CallHeader snap={snap} compact={!!openMark} />
      <Transcript snap={snap} marksByEntry={marksByEntry} fresh={fresh} openId={openId} onOpen={(m) => setOpenId(m.id)} compact={!!openMark} />
      {openMark ? (
        <div className="mt-3">
          <CorrectionSheet
            mark={openMark}
            context={snap.entries.find((e) => e.id === openMark.entryId)?.text ?? openMark.phrase}
            onClose={close}
            onHear={speak}
          />
        </div>
      ) : (
        <>
          <MarkLane snap={snap} now={now} onOpen={(m) => setOpenId(m.id)} />
          {reconnecting ? (
            <div className="pb-safe flex gap-2.5 px-4 pt-3">
              <Button variant="secondary" className="min-h-16 flex-1" onClick={() => void call.retry()}>
                Retry now
              </Button>
              <Button variant="strong" className="min-h-16 flex-1" onClick={() => void call.end()}>
                End &amp; save
              </Button>
            </div>
          ) : (
            <Controls call={call} snap={snap} />
          )}
        </>
      )}
    </div>
  )
}

function CallHeader({ snap, compact }: { snap: CallSnapshot; compact: boolean }) {
  const { phase, floor } = snap
  const status =
    phase === 'connecting'
      ? 'Connecting…'
      : phase === 'reconnecting'
        ? 'Reconnecting…'
        : floor === 'tutor'
          ? 'Speaking'
          : floor === 'me'
            ? 'Listening to you'
            : 'Listening'
  const pct = Math.min(100, (snap.elapsedMs / MAX_CALL_MS) * 100)

  if (compact) {
    return (
      <div className="pt-safe flex items-center gap-2.5 px-4 pb-2">
        <Avatar name={tutor.name} size={32} />
        <span className="flex-1 text-sm font-semibold">
          <span className="font-extrabold">Call continues</span>
          <span className="text-muted"> · {tutor.name} is {floor === 'tutor' ? 'speaking' : 'listening'}</span>
        </span>
        <span className="text-[15px] font-extrabold tabular-nums">{clock(snap.elapsedMs)}</span>
      </div>
    )
  }

  return (
    <header className="pt-safe flex flex-col gap-3 px-5 pb-3">
      <div className="flex items-center gap-3 pt-2">
        <Avatar name={tutor.name} size={48} speaking={floor === 'tutor'} dimmed={phase !== 'live'} />
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-[17px] font-extrabold">{tutor.name}</span>
          <span className="flex items-center gap-2 text-[13px] font-semibold text-muted" aria-live="polite">
            {floor === 'tutor' && phase === 'live' && <LevelBars />}
            {floor === 'me' && phase === 'live' && <LevelBars level={snap.micLevel} color="var(--ink)" />}
            {phase === 'reconnecting' && <Icon name="refresh" size={14} />}
            {status}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className={`text-xl font-extrabold tabular-nums ${phase === 'reconnecting' ? 'text-muted' : ''}`}>
            {clock(snap.elapsedMs)}
          </span>
          <span className="text-xs font-semibold text-muted">{phase === 'reconnecting' ? 'paused' : 'of 15:00'}</span>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <div
          role="progressbar"
          aria-label="Call time"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1 flex-1 rounded-full bg-line"
        >
          <div className="h-1 rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-muted">
          <Icon name="device" size={14} />
          Screen on
        </span>
      </div>
    </header>
  )
}

function Transcript({
  snap,
  marksByEntry,
  fresh,
  openId,
  onOpen,
  compact,
}: {
  snap: CallSnapshot
  marksByEntry: Map<string, Mark[]>
  fresh: Set<string>
  openId: string | null
  onOpen: (m: Mark) => void
  compact: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const stick = useRef(true)

  // Follow the conversation unless the learner scrolled up to reread something.
  useLayoutEffect(() => {
    const el = ref.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [snap.entries, compact])

  // When a mark opens, keep its bubble in view above the sheet.
  useLayoutEffect(() => {
    if (!openId) return
    ref.current?.querySelector('.mark-open')?.scrollIntoView({ block: 'center' })
  }, [openId])

  return (
    <section
      ref={ref}
      aria-label="Live transcript"
      onScroll={(e) => {
        const el = e.currentTarget
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
      }}
      className={`mx-3 flex min-h-0 flex-col gap-2.5 overflow-y-auto rounded-[26px] bg-area p-3.5 ${
        compact ? 'h-[210px] shrink-0' : 'flex-1'
      }`}
    >
      <div className="flex-1" />
      {snap.entries.length === 0 && (
        <p className="m-0 self-center py-6 text-center text-sm font-semibold text-muted">
          {snap.phase === 'connecting' ? `Calling ${tutor.name}…` : `${tutor.name} is about to say hello.`}
        </p>
      )}
      {snap.entries.map((entry) => (
        <TranscriptBubble
          key={entry.id}
          entry={entry}
          marks={marksByEntry.get(entry.id)}
          freshMarkIds={fresh}
          openMarkId={openId}
          onOpenMark={onOpen}
          compact={compact}
        />
      ))}
    </section>
  )
}

/**
 * Reserved strip between transcript and controls. New marks announce themselves here, so nothing
 * ever overlays the transcript.
 */
function MarkLane({ snap, now, onOpen }: { snap: CallSnapshot; now: number; onOpen: (m: Mark) => void }) {
  if (snap.phase === 'reconnecting') {
    return (
      <div role="status" className="mx-4 mt-3 flex items-start gap-3 rounded-[22px] bg-card px-4 py-3.5">
        <Icon name="wifiOff" className="mt-0.5 shrink-0" />
        <div className="flex flex-col gap-1">
          <span className="text-base font-extrabold">Connection lost</span>
          <span className="text-sm leading-snug font-medium text-muted">
            Trying again for 30 s. Your transcript and marks are saved.
          </span>
        </div>
      </div>
    )
  }

  const newest = snap.marks[snap.marks.length - 1]
  if (newest && now - newest.createdAt < NEW_CHIP_MS) {
    return (
      <div className="flex h-[60px] items-center px-4">
        <button
          type="button"
          onClick={() => onOpen(newest)}
          className="flex min-h-12 w-full items-center gap-2.5 rounded-full border-[1.5px] border-mark py-0 pr-2 pl-4 text-left text-sm font-semibold"
        >
          <span className="font-extrabold">New mark</span>
          <span lang="es" className={`mark mark-${newest.type}`} style={{ cursor: 'inherit' }}>
            {newest.phrase}
          </span>
          <span className="flex-1 truncate text-muted">{typeLabel[newest.type]} · tap to see</span>
          <Icon name="chevron" size={20} />
        </button>
      </div>
    )
  }

  const n = snap.marks.length
  return (
    <div role="status" className="flex h-[60px] items-center gap-2.5 px-5 text-[13px] font-semibold text-muted">
      {n > 0 ? (
        <>
          <MarkSample type="grammar" width={18} />
          {n} {n === 1 ? 'mark' : 'marks'} so far · tap any underline
        </>
      ) : snap.floor === 'me' ? (
        'Keep going — marks appear without stopping you'
      ) : (
        'Mistakes get underlined as you speak'
      )}
    </div>
  )
}

function Controls({ call, snap }: { call: TutorCall; snap: CallSnapshot }) {
  const connecting = snap.phase === 'connecting'

  if (snap.pushToTalk) {
    const hold = (on: boolean) => () => call.setTalking(on)
    return (
      <div className="pb-safe flex items-center gap-4 px-4 pt-1">
        <CallControl icon="openMic" label="Open mic" size={56} onClick={() => call.setPushToTalk(false)} aria-label="Switch to open mic" />
        <button
          type="button"
          aria-pressed={snap.talking}
          onPointerDown={hold(true)}
          onPointerUp={hold(false)}
          onPointerCancel={hold(false)}
          onPointerLeave={hold(false)}
          onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && call.setTalking(true)}
          onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && call.setTalking(false)}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex min-h-[72px] flex-1 touch-none items-center justify-center gap-2.5 rounded-full text-[17px] font-semibold select-none ${
            snap.talking ? 'bg-mark text-on-accent' : 'bg-accent text-on-accent'
          }`}
        >
          <Icon name="mic" />
          {snap.talking ? 'Talking…' : 'Hold to talk'}
        </button>
        <CallControl icon="phoneDown" label="End" tone="end" size={56} onClick={() => void call.end()} aria-label="End call" />
      </div>
    )
  }

  return (
    <div className="pb-safe grid grid-cols-4 gap-2 px-4">
      <CallControl
        icon={snap.muted ? 'micOff' : 'mic'}
        label={snap.muted ? 'Unmute' : 'Mute'}
        tone={snap.muted ? 'on' : 'default'}
        aria-pressed={snap.muted}
        disabled={connecting}
        onClick={() => call.setMuted(!snap.muted)}
      />
      <CallControl
        icon={snap.speakerOn ? 'speaker' : 'speakerLow'}
        label="Speaker"
        tone={snap.speakerOn ? 'on' : 'default'}
        aria-pressed={snap.speakerOn}
        onClick={() => call.setSpeaker(!snap.speakerOn)}
      />
      <CallControl
        icon="openMic"
        label="Open mic"
        aria-label="Talk mode: open mic. Switch to push to talk"
        disabled={connecting}
        onClick={() => call.setPushToTalk(true)}
      />
      <CallControl icon="phoneDown" label="End" tone="end" aria-label="End call" onClick={() => void call.end()} />
    </div>
  )
}

// ── After the call ──

function CallEnded({ snap }: { snap: CallSnapshot }) {
  return (
    <div className="pt-safe flex h-full flex-col">
      <main className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pt-4">
        <header className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-muted">Call with {tutor.name} ended</span>
          <h1 className="m-0 text-[44px] leading-none font-extrabold tracking-tight tabular-nums">{clock(snap.elapsedMs)}</h1>
        </header>
        <section className="flex flex-col">
          <h2 className="m-0 mb-1 text-[13px] font-bold tracking-wider text-muted uppercase">
            {snap.marks.length ? `Marked (${snap.marks.length})` : 'No marks this time'}
          </h2>
          {snap.marks.map((m) => (
            <div key={m.id} className="flex min-h-14 items-center gap-3 border-b border-line py-2 last:border-0">
              <div className="flex flex-1 flex-col gap-0.5">
                <span lang="es" className="text-base font-semibold">
                  <span className={`mark mark-${m.type}`} style={{ cursor: 'default' }}>
                    {m.phrase}
                  </span>{' '}
                  → {m.correction}
                </span>
                <span className="text-[13px] font-medium text-muted">{typeLabel[m.type]}</span>
              </div>
              {m.seen > 1 && (
                <span aria-label={`${m.seen} times`} className="text-xl font-extrabold text-mark">
                  ×{m.seen}
                </span>
              )}
            </div>
          ))}
        </section>
      </main>
      <div className="pb-safe border-t border-line px-5 pt-3.5">
        <ButtonLink to="/" className="w-full">
          Back to Today
        </ButtonLink>
      </div>
    </div>
  )
}

function CallError({ message }: { message?: string }) {
  return (
    <div className="pt-safe pb-safe flex h-full flex-col gap-4 px-6">
      <div className="flex flex-1 flex-col justify-center gap-3">
        <h1 className="m-0 text-[28px] font-extrabold tracking-tight">The call didn't connect</h1>
        <p className="m-0 text-base leading-normal text-muted">{message}</p>
      </div>
      <Button onClick={() => window.location.reload()}>Try again</Button>
      <ButtonLink to="/" variant="text" size="md">
        Back to Today
      </ButtonLink>
    </div>
  )
}

function clock(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function speak(text: string) {
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'es-ES'
  u.rate = 0.9
  speechSynthesis.cancel()
  speechSynthesis.speak(u)
}
