import { initializeApp, onLog, type FirebaseApp } from 'firebase/app'
import { getAI, GoogleAIBackend, type AI } from 'firebase/ai'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId)

let app: FirebaseApp | undefined
let ai: AI | undefined

export function getFirebaseAI(): AI {
  if (!firebaseConfigured) {
    throw new Error('Firebase is not configured. Copy .env.example to .env.local and fill in your web app config.')
  }
  if (!app) {
    app = initializeApp(config)
    startAppCheck(app)
  }
  ai ??= getAI(app, { backend: new GoogleAIBackend() })
  return ai
}

/**
 * App Check proves requests come from this app, so the public web config can't be used to spend
 * the Gemini quota. Production uses reCAPTCHA Enterprise; local testing uses a debug token that is
 * registered in the Firebase console (App Check → Apps → Manage debug tokens).
 */
function startAppCheck(firebaseApp: FirebaseApp) {
  const siteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY
  const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN
  if (debugToken) {
    ;(self as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken
  } else if (!siteKey) {
    return // App Check not set up: works only while enforcement is off for AI Logic.
  }
  initializeAppCheck(firebaseApp, {
    // With a debug token the provider is never called, so the key only matters in production.
    provider: new ReCaptchaEnterpriseProvider(siteKey ?? 'debug-token-only'),
    isTokenAutoRefreshEnabled: true,
  })
}

/**
 * The SDK only logs why the Live server closed the socket ("API key not valid", "API not enabled"…)
 * and throws a generic handshake error, so keep the last reason to show it to the user.
 */
let lastServerCloseReason: string | undefined
onLog(
  ({ message }) => {
    const m = /closed by (?:the )?server(?: with reason:|\. Reason:)\s*'?(.+?)'?$/.exec(message)
    if (m?.[1]) lastServerCloseReason = m[1]
  },
  { level: 'warn' },
)

export function takeServerCloseReason() {
  const r = lastServerCloseReason
  lastServerCloseReason = undefined
  return r
}

export const LIVE_MODEL = import.meta.env.VITE_LIVE_MODEL || 'gemini-3.1-flash-live-preview'
export const CHECKER_MODEL = import.meta.env.VITE_CHECKER_MODEL || 'gemini-3.5-flash-lite'
