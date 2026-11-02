import { useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { Icon } from '../components/Icon'
import { getContent, vocabScreens, type Content } from '../content'
import { finishOnboarding, getLearner, setPlacement, useLearner, type Learner } from '../lib/learner'
import { tutor } from '../lib/profile'
import * as P from '../placement/engine'

/** The first lesson's placement: the same fixed screens for every learner (PLAN.md §1–4). */
export function Placement() {
  const learner = useLearner()
  // Checked once: leaving the results screen sets `onboarded` and navigates by itself.
  const [done] = useState(() => getLearner().onboarded)
  if (done) return <Navigate to="/" replace />
  const c = getContent(learner.targetLanguage)
  const s = learner.placement

  return (
    <div className="pt-safe pb-safe flex h-full flex-col">
      {s.screen !== 'welcome' && s.screen !== 'results' && <ProgressBar value={P.progress(s, c)} />}
      {s.screen === 'welcome' && <Welcome onStart={() => setPlacement(P.start(s))} />}
      {s.screen === 'q1' && (
        <Question
          title="How much Spanish do you know?"
          options={[
            { label: 'I know a few words', onPick: () => setPlacement(P.answerPath(s, 'words')) },
            { label: 'I know it well, but I want to practice speaking', onPick: () => setPlacement(P.answerPath(s, 'speaking')) },
          ]}
        />
      )}
      {s.screen === 'q2' && (
        <Question
          title="Where have you learned Spanish so far?"
          options={[
            { label: 'Duolingo', onPick: () => setPlacement(P.answerPlatform(s, 'duolingo', c)) },
            { label: 'Another learning app', onPick: () => setPlacement(P.answerPlatform(s, 'app', c)) },
            { label: 'Neither / a class / on my own', onPick: () => setPlacement(P.answerPlatform(s, 'other', c)) },
          ]}
        />
      )}
      {s.screen === 'vocab' && <Bubbles s={s} c={c} />}
      {s.screen === 'grammar' && <Ladder key={`${s.rung}.${s.answers.length}`} s={s} c={c} />}
      {s.screen === 'results' && learner.result && <Results learner={learner} c={c} />}
    </div>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Placement progress"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="mx-5 mt-2 h-2 shrink-0 overflow-hidden rounded-full bg-sunk"
    >
      <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${value * 100}%` }} />
    </div>
  )
}

function Screen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <>
      <main className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pt-6 pb-4">{children}</main>
      {footer && <div className="flex flex-col gap-1 border-t border-line px-5 pt-3.5">{footer}</div>}
    </>
  )
}

// ── Welcome and opening questions ──

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <Screen footer={<Button onClick={onStart}>Let's start</Button>}>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <Avatar name={tutor.name} size={120} />
        <h1 lang="es" className="m-0 text-[34px] font-extrabold tracking-tight">
          ¡Hola!
        </h1>
        <p className="m-0 max-w-80 text-[17px] leading-normal text-muted">
          I'm {tutor.name}, your Spanish tutor. First, a few quick questions so our first call starts at the right
          level for you. It takes about 3 minutes.
        </p>
      </div>
    </Screen>
  )
}

function Question({ title, options }: { title: string; options: { label: string; onPick: () => void }[] }) {
  return (
    <Screen>
      <h1 className="m-0 text-[28px] leading-tight font-extrabold tracking-tight">{title}</h1>
      <div className="flex flex-col gap-3">
        {options.map((o) => (
          <OptionButton key={o.label} onClick={o.onPick}>
            {o.label}
          </OptionButton>
        ))}
      </div>
    </Screen>
  )
}

function OptionButton({ children, lang, onClick }: { children: ReactNode; lang?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      lang={lang}
      onClick={onClick}
      className="flex min-h-16 items-center justify-between gap-3 rounded-[22px] border-[1.5px] border-line bg-bg px-5 py-3 text-left text-[17px] font-semibold active:border-mark active:bg-sunk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {children}
      <Icon name="chevron" size={20} className="shrink-0 text-muted" />
    </button>
  )
}

// ── Vocabulary bubbles (path 1) ──

function Bubbles({ s, c }: { s: P.PlacementState; c: Content }) {
  const screens = vocabScreens(c)
  const screen = screens[s.vocabIndex]
  const taps = s.taps[screen.section] ?? []
  return (
    <Screen
      footer={
        <>
          <Button onClick={() => setPlacement(P.submitVocab(s, c))} disabled={!taps.length}>
            {taps.length ? `Next · ${taps.length} known` : 'Tap the words you know'}
          </Button>
          <Button variant="text" size="md" onClick={() => setPlacement(P.submitVocab(s, c, true))}>
            I don't know any of these
          </Button>
        </>
      }
    >
      <header className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold tracking-wider text-muted uppercase">
          Words · {s.vocabIndex + 1} of {screens.length}
        </span>
        <h1 className="m-0 text-[28px] leading-tight font-extrabold tracking-tight">Tap every word you know</h1>
        <p className="m-0 text-[15px] leading-normal text-muted">Only the ones you'd understand if you heard them.</p>
      </header>
      <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
        {screen.words.map((w) => {
          const on = taps.includes(w.word)
          return (
            <li key={w.word}>
              <button
                type="button"
                lang="es"
                aria-pressed={on}
                onClick={() => setPlacement(P.toggleWord(s, c, w.word))}
                className={`inline-flex min-h-12 items-center gap-1.5 rounded-full border-[1.5px] px-4 text-[17px] font-semibold transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  on ? 'border-accent bg-accent text-on-accent' : 'border-line bg-bg text-ink active:border-mark'
                }`}
              >
                {on && <Icon name="check" size={18} />}
                {w.word}
              </button>
            </li>
          )
        })}
      </ul>
    </Screen>
  )
}

// ── Grammar ladder ──

function Ladder({ s, c }: { s: P.PlacementState; c: Content }) {
  const rung = c.rungs.find((r) => r.rung === s.rung)!
  const item = rung.items[s.answers.length]
  const [before, after = ''] = item.prompt.split('___')
  const answer = (option: number) => setPlacement(P.answerGrammar(s, c, option))
  return (
    <Screen>
      <header className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold tracking-wider text-muted uppercase">Grammar</span>
        <h1 className="m-0 text-[28px] leading-tight font-extrabold tracking-tight">Pick the word that fits</h1>
      </header>
      <p lang="es" className="m-0 rounded-[22px] bg-card px-5 py-6 text-[22px] leading-snug font-bold">
        {before}
        <span aria-label="blank" className="mx-1 inline-block w-16 border-b-[2.5px] border-ink align-baseline" />
        {after}
      </p>
      <div className="flex flex-col gap-2.5">
        {item.options.map((o, k) => (
          <OptionButton key={o} lang="es" onClick={() => answer(k)}>
            {o}
          </OptionButton>
        ))}
        <Button variant="text" size="md" onClick={() => answer(P.DONT_KNOW)}>
          I don't know
        </Button>
      </div>
    </Screen>
  )
}

// ── Results ──

function Results({ learner, c }: { learner: Learner; c: Content }) {
  const navigate = useNavigate()
  const [picking, setPicking] = useState(false)
  const r = learner.result!
  const callNow = () => {
    finishOnboarding()
    navigate('/call', { replace: true })
  }
  if (picking) return <CallLater onCancel={() => setPicking(false)} onDone={() => navigate('/', { replace: true })} />

  return (
    <Screen
      footer={
        <>
          <Button onClick={callNow}>
            <Icon name="phone" size={22} />
            Call {tutor.name} now
          </Button>
          <Button variant="text" size="md" onClick={() => setPicking(true)}>
            Call later
          </Button>
        </>
      }
    >
      <div className="flex flex-1 flex-col justify-center gap-5">
        <Avatar name={tutor.name} size={72} />
        <h1 className="m-0 text-[30px] leading-tight font-extrabold tracking-tight">{r.beginner ? 'Great place to start' : '¡Muy bien!'}</h1>
        <p className="m-0 text-[17px] leading-normal">{summary(r, c)}</p>
        <p className="m-0 text-[15px] leading-normal text-muted">{nextStep(r)}</p>
        {r.missed.length > 0 && (
          <p className="m-0 flex items-center gap-2 text-[15px] font-semibold text-muted">
            <Icon name="vocab" size={20} />
            {r.missed.length} new words are waiting in your Vocab list.
          </p>
        )}
      </div>
    </Screen>
  )
}

/** The friendly summary. No CEFR label, ever. */
function summary(r: P.PlacementResult, c: Content): string {
  const solid = c.rungs.find((x) => x.rung === r.grammarRung)
  const next = c.rungs.find((x) => x.rung > r.grammarRung)
  const parts: string[] = []

  if (r.beginner) {
    parts.push("You're just starting out, and that's perfect: our first call is built for exactly this.")
  } else {
    if (r.path === 'words') {
      parts.push(r.tapped.length ? `You know ${r.tapped.length} of our core words` : `We'll build your core words together`)
    } else {
      parts.push('You already have a good base')
    }
    if (solid) parts[0] += `, and you're solid on ${lowerFirst(solid.topic)}.`
    else parts[0] += '.'
    parts.push(next ? `Next up: ${lowerFirst(next.topic)}.` : 'You handled every grammar question we had.')
  }

  const section = P.duolingoSection(r, c)
  if (r.platform === 'duolingo' && section) parts.push(`That's about Duolingo section ${section}.`)
  return parts.join(' ')
}

function nextStep(r: P.PlacementResult): string {
  const lead =
    r.platform === 'duolingo'
      ? "Duolingo taught you to read and tap. Now let's get you talking."
      : r.platform === 'app'
        ? 'Apps are great for words. Calls are where they turn into speaking.'
        : "Whatever you've learned so far, the calls build on it."
  const call = r.beginner
    ? `In your first call, ${tutor.name} will teach you your first 5 Spanish phrases, mostly in English.`
    : `Your first call is about 10 minutes: ${tutor.name} gets to know you and teaches you 3 new words.`
  return `${lead} ${call}`
}

const lowerFirst = (t: string) => (/^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t)

// ── Call later ──

function CallLater({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const [time, setTime] = useState(defaultTime)
  const save = () => {
    const [h, m] = time.split(':').map(Number)
    const at = new Date()
    at.setHours(h, m, 0, 0)
    if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1)
    finishOnboarding(at.getTime())
    onDone()
  }
  return (
    <Screen
      footer={
        <>
          <Button onClick={save} disabled={!time}>
            Set the call
          </Button>
          <Button variant="text" size="md" onClick={onCancel}>
            Back
          </Button>
        </>
      }
    >
      <h1 className="m-0 text-[28px] leading-tight font-extrabold tracking-tight">When should {tutor.name} call?</h1>
      <p className="m-0 text-[15px] leading-normal text-muted">
        You'll see it as your next call on Today. If the time has passed today, it's set for tomorrow.
      </p>
      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-bold tracking-wider text-muted uppercase">Time</span>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="min-h-16 rounded-[22px] border-[1.5px] border-line bg-bg px-5 text-[24px] font-extrabold text-ink focus-visible:outline-2 focus-visible:outline-accent"
        />
      </label>
    </Screen>
  )
}

/** An hour from now, rounded up to the half hour. */
function defaultTime() {
  const d = new Date(Date.now() + 60 * 60_000)
  d.setMinutes(d.getMinutes() > 30 ? 60 : 30, 0, 0)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
