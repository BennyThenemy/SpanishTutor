// Diagnostic: opens a Live session with the app's Firebase config and prints the server's reply.
// Usage: node scripts/live-probe.mjs [model]
import { readFileSync } from 'node:fs'
import { initializeApp } from 'firebase/app'
import { getAI, getLiveGenerativeModel, GoogleAIBackend, ResponseModality } from 'firebase/ai'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^(["'])(.*)\1$/, '$2')]),
)

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})
const ai = getAI(app, { backend: new GoogleAIBackend() })
const variant = process.argv[3] ?? 'full'
const model = process.argv[2] ?? env.VITE_LIVE_MODEL ?? 'gemini-3.1-flash-live-preview'

const generationConfig =
  variant === 'bare'
    ? { responseModalities: [ResponseModality.AUDIO] }
    : {
        responseModalities: [ResponseModality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      }

console.log(`model=${model} variant=${variant}`)
try {
  const live = getLiveGenerativeModel(ai, {
    model,
    systemInstruction: variant === 'bare' ? undefined : 'You are a Spanish tutor.',
    generationConfig,
  })
  const session = await live.connect()
  console.log('CONNECTED: setupComplete received')
  await session.close()
} catch (e) {
  console.log('FAILED:', e?.message ?? e)
}
process.exit(0)
