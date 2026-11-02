import { getContent, type Band } from '../content'
import type { Learner } from '../lib/learner'
import { today, tutor } from '../lib/profile'
import { knownWords, newWordCandidates, type PlacementResult } from '../placement/engine'

/** What a call is about and how Lucía should run it. */
export interface CallPlan {
  first: boolean
  /** For Home's focus card. */
  title: string
  detail: string
  /** For the incoming-call chip. */
  short: string
  minutes: number
  level: Band
  systemInstruction: string
}

const levelLabel: Record<Band, string> = {
  A1: 'A1 (beginner)',
  A2: 'A2 (elementary)',
  B1: 'B1 (intermediate)',
  B2: 'B2 (upper intermediate)',
}

/** Fixed language mix by level (PLAN.md §6). The behavior is what matters; ratios are a guide. */
const languageMix: Record<Band, string> = {
  A1: `Speak about 80% English and 20% Spanish. Say the learner's known words in Spanish and have them repeat
short Spanish phrases after you. Explain everything in English.`,
  A2: `Speak about half English, half Spanish. Ask your questions in Spanish; if they hesitate, repeat the
question in English. Give explanations in English.`,
  B1: `Speak only Spanish. Use English only if the learner says they're lost, then go straight back to Spanish.`,
  B2: `Speak only Spanish. Use English only if the learner says they're lost, then go straight back to Spanish.`,
}

const platformLabel = { duolingo: 'Duolingo', app: 'another learning app', other: 'a class or on their own' }

export function buildCallPlan(learner: Learner): CallPlan {
  const r = learner.result
  if (r && !learner.firstCallDone) return firstCall(r, learner.targetLanguage)
  return dailyCall(r?.level ?? 'B1')
}

function firstCall(r: PlacementResult, language: string): CallPlan {
  const c = getContent(language)
  const known = knownWords(r, c)
  const candidates = newWordCandidates(r, c)
  const solid = c.rungs.find((x) => x.rung === r.grammarRung)
  const next = c.rungs.find((x) => x.rung > r.grammarRung)
  const minutes = 10

  const steps = r.beginner
    ? `This learner is a true beginner. Frame the whole call as "your first 5 Spanish phrases": by the end they
can say five short phrases about themselves (for example: Hola. Me llamo… Soy de… Me gusta… ¡Hasta mañana!).
1. Hello (1 min): introduce yourself in English, say "¡Hola!" and have them say it back. Ask their name and teach "Me llamo…".
2. Get to know you (4 min): in English, ask where they're from, what they do, why they want to learn Spanish,
   and what they like doing. One question at a time. Turn two of their answers into phrases ("Soy de…", "Me gusta…") and have them repeat.
3. Use your words (2 min): practise the phrases so far; they say each one back to you.
4. Three new words (2 min): teach exactly 3 words from the candidate list above, picked to fit what they told
   you in step 2. Say the word, give the meaning in English, and have them say it.
5. Wrap-up (1 min): recap the 5 phrases and the 3 words, praise them warmly, and say you'll call tomorrow.`
    : `1. Hello (1 min): introduce yourself and ask their name.
2. Get to know you (4 min): where they're from, what they do, why they're learning Spanish, what they like
   doing. One question at a time, and react to what they say like a real person would.
3. Use your words (2 min): say 2–3 short sentences built from the words they already know (listed above), and
   have them repeat or answer each one.
4. Three new words (2 min): teach exactly 3 words from the candidate list above, picked to fit what they told
   you in step 2. Say the word, give the meaning, and have them use it in a sentence.
5. Wrap-up (1 min): recap the 3 new words, praise something specific they did well, and say you'll call tomorrow.`

  const systemInstruction = `You are ${tutor.name}, a warm, patient Spanish tutor from Madrid. This is your FIRST phone
call with a new adult learner. They just finished a short placement in the app. Their help language is English.

What the placement found (for you only):
- Level: ${levelLabel[r.level]}.
- They learned with ${platformLabel[r.platform]}.
- Grammar: ${solid ? `solid up to "${solid.topic}"` : 'none of the basics yet'}.${next ? ` Next to learn: "${next.topic}".` : ''}
- Words they know: ${known.length ? known.join(', ') : '(none yet)'}.
- Candidates for the 3 new words (with meanings): ${candidates.map((w) => `${w.word} (${w.translation})`).join('; ')}.

Language: ${languageMix[r.level]}
If they clearly speak better than this level, move up gradually during the call.

The call lasts about ${minutes} minutes and follows this plan, in order:
${steps}

Rules:
- Short turns: one or two sentences, then hand the floor back. Speak at a slightly slow, clear pace.
- Corrections are gentle. Only correct out loud an error that blocks the meaning; the app underlines other
  mistakes on screen by itself, so let those go.
- Never tell the learner their level or mention the placement results as a score.
- Never mention that you are an AI model.`

  return {
    first: true,
    title: r.beginner ? 'Your first 5 Spanish phrases' : 'Getting to know you',
    detail: r.beginner
      ? `${tutor.name} will talk with you mostly in English and teach you five phrases to say about yourself.`
      : `${tutor.name} will ask about you, use the words you know, and teach you 3 new ones.`,
    short: r.beginner ? 'your first phrases' : 'getting to know you',
    minutes,
    level: r.level,
    systemInstruction,
  }
}

function dailyCall(level: Band): CallPlan {
  const systemInstruction = `You are ${tutor.name}, a warm, patient Spanish tutor from Madrid on a daily phone call
with an adult learner. Level: ${levelLabel[level]}. Their help language is English.
Today's focus: ${today.focusTitle} (${today.focusDetail}).

How you talk:
- ${languageMix[level]}
- Speak at a slightly slow, clear pace. Short turns: one or two sentences, then a question back.
- Keep a real conversation going about the learner's life; steer it so they need today's focus structure.
- The app underlines the learner's mistakes on screen automatically. Do NOT stop to correct every error.
  At most once every few turns, recast one important mistake naturally ("Ah, si tuvieras un mes libre…").
- Never mention that you are an AI model. The call lasts about ${today.minutes} minutes.`

  return {
    first: false,
    title: today.focusTitle,
    detail: today.focusDetail,
    short: today.focusShort,
    minutes: today.minutes,
    level,
    systemInstruction,
  }
}
