import { getGenerativeModel, Schema, type GenerativeModel } from 'firebase/ai'
import { CHECKER_MODEL, getFirebaseAI } from '../lib/firebase'
import { learner } from '../lib/profile'
import type { MistakeType } from './types'

export interface Finding {
  phrase: string
  correction: string
  explanation: string
  explanationHe?: string
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
          explanationHe: Schema.string({ description: 'The same explanation in Hebrew.' }),
          type: Schema.enumString({ enum: ['grammar', 'vocab', 'pronunciation'] }),
        },
        optionalProperties: ['explanationHe'],
      }),
    }),
  },
})

const instructions = `You check a ${learner.level} Spanish learner's speech while they talk on a call.
The text is an automatic speech transcript, so ignore punctuation, capitalisation, filler words (eh, mmm)
and unfinished trailing words. Only flag real errors a patient teacher would point out:
- grammar: conjugation, tense/mood (e.g. "si tendría" → "si tuviera"), ser/estar, gender/number agreement, prepositions
- vocab: wrong word, anglicisms and false friends (e.g. "aplicar para un trabajo" → "solicitar un trabajo")
- pronunciation: only when the transcript clearly shows a mispronounced word (e.g. "perro" where "pero" was meant)
Keep "phrase" minimal (1–4 words) and copied character-for-character from the segment.
Return an empty list when the segment is fine. Never flag correct but informal Spanish.
${learner.helpLanguage === 'he' ? 'Always fill explanationHe.' : 'Leave explanationHe out.'}`

let model: GenerativeModel | undefined

/**
 * Looks for mistakes in one new segment of what the learner is saying. It runs on a fast text model
 * alongside the Live session, so marks land while the learner is still mid-sentence.
 */
export async function checkSegment(utterance: string, segment: string, signal?: AbortSignal): Promise<Finding[]> {
  model ??= getGenerativeModel(getFirebaseAI(), {
    model: CHECKER_MODEL,
    systemInstruction: instructions,
    generationConfig: { responseMimeType: 'application/json', responseSchema: findingsSchema },
  })
  const prompt = `Full utterance so far:\n"${utterance}"\n\nCheck only this new segment:\n"${segment}"`
  const result = await model.generateContent(prompt, { signal })
  const parsed = JSON.parse(result.response.text()) as { mistakes?: Finding[] }
  return (parsed.mistakes ?? []).filter((m) => m.phrase?.trim() && m.correction?.trim())
}
