import { getGenerativeModel, Schema, type GenerativeModel } from 'firebase/ai'
import { CHECKER_MODEL, getFirebaseAI } from '../lib/firebase'
import type { Band } from '../content'
import type { MistakeType } from './types'

export interface Finding {
  phrase: string
  correction: string
  explanation: string
  type: MistakeType
}

const findingsSchema = Schema.object({
  properties: {
    mistakes: Schema.array({
      items: Schema.object({
        properties: {
          phrase: Schema.string({ description: 'The wrong words, copied exactly from the segment.' }),
          correction: Schema.string({ description: 'The corrected phrase, same scope as `phrase`.' }),
          explanation: Schema.string({ description: 'One short sentence in English: the rule, not a lecture.' }),
          type: Schema.enumString({ enum: ['grammar', 'vocab', 'pronunciation'] }),
        },
      }),
    }),
  },
})

const instructions = (level: Band) => `You check a ${level} Spanish learner's speech while they talk on a call.
The text is an automatic speech transcript, so ignore punctuation, capitalisation, filler words (eh, mmm)
and unfinished trailing words. Only flag real errors a patient teacher would point out:
- grammar: conjugation, tense/mood (e.g. "si tendría" → "si tuviera"), ser/estar, gender/number agreement, prepositions
- vocab: wrong word, anglicisms and false friends (e.g. "aplicar para un trabajo" → "solicitar un trabajo")
- pronunciation: only when the transcript clearly shows a mispronounced word (e.g. "perro" where "pero" was meant)
Keep "phrase" minimal (1–4 words) and copied character-for-character from the segment.
Return an empty list when the segment is fine. Never flag correct but informal Spanish.`

const models = new Map<Band, GenerativeModel>()

/**
 * Looks for mistakes in one new segment of what the learner is saying. It runs on a fast text model
 * alongside the Live session, so marks land while the learner is still mid-sentence.
 */
export async function checkSegment(
  level: Band,
  utterance: string,
  segment: string,
  signal?: AbortSignal,
): Promise<Finding[]> {
  let model = models.get(level)
  if (!model) {
    model = getGenerativeModel(getFirebaseAI(), {
      model: CHECKER_MODEL,
      systemInstruction: instructions(level),
      generationConfig: { responseMimeType: 'application/json', responseSchema: findingsSchema },
    })
    models.set(level, model)
  }
  const prompt = `Full utterance so far:\n"${utterance}"\n\nCheck only this new segment:\n"${segment}"`
  const result = await model.generateContent(prompt, { signal })
  const parsed = JSON.parse(result.response.text()) as { mistakes?: Finding[] }
  return (parsed.mistakes ?? []).filter((m) => m.phrase?.trim() && m.correction?.trim())
}
