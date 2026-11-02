# Hablemos — Spanish tutor calls (MVP)

A PWA that feels like a phone call with a patient Spanish tutor. Lucía talks with you through the
Gemini Live API (via Firebase AI Logic). A second, fast text model checks each phrase of what you say
and underlines mistakes in the live transcript while you're still talking.

This MVP covers **the first lesson** (placement + first call, see `PLAN.md`), **Home**, **the call** and
the **Vocab** list. Mistakes, Library and Settings are placeholders.

## Setup

1. Create a Firebase project, add a **Web app**, and enable **Firebase AI Logic** with the
   **Gemini Developer API** (Build → AI Logic in the console).
2. `cp .env.example .env.local` and paste your web app config.
   If App Check is enforced for AI Logic, add a debug token: App Check → Apps → your web app →
   ⋮ → **Manage debug tokens** → **Add debug token**, then put it in `VITE_APPCHECK_DEBUG_TOKEN`.
3. `npm install`
4. `npm run dev` → http://localhost:5173

### Testing on a phone

The microphone only works on a secure origin, so use `npm run dev:phone`. It serves HTTPS on your
LAN with a self-signed certificate: open the `https://192.168.x.x:5173` URL it prints on your phone
and accept the certificate warning. Or deploy `dist/` to Firebase Hosting.

### Without Firebase

`/call?demo` (dev server only) shows a mid-call transcript with marks, so you can work on the
layout without making calls.

## First lesson and learner data

- `db/*.sql` is the placement content. `npm run content` turns it into `src/content/<language>.json`,
  which ships inside the app (it uses Node's built-in `node:sqlite`, Node 22.5+).
- `src/placement/engine.ts` — the placement rules: vocab bubbles, grammar ladder, level, results.
- `src/lib/learner.ts` — the learner (placement progress, result, vocab list, next call). Stored on
  this device only (localStorage) for now; Firestore later.
- `src/call/plan.ts` — what Lucía is told: the fixed first-call plan, or the daily call.
- Dev only: open `/?reset` to forget the learner and take the placement again.

## How a call works

- `src/call/TutorCall.ts` — the call: Live session, transcript, marks, reconnects, 15-minute cap,
  screen wake lock.
- `src/call/audio.ts` — mic → 16 kHz PCM (AudioWorklet), and 24 kHz PCM playback with barge-in.
  This replaces the SDK's `startAudioConversation()` helper, which takes over the message stream
  that the transcripts need.
- `src/call/checker.ts` — runs `gemini-3.5-flash-lite` on each new clause of your speech and returns
  structured findings (grammar / vocab / pronunciation), which become underlines.

Models can be changed with `VITE_LIVE_MODEL` and `VITE_CHECKER_MODEL`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run dev:phone` | Dev server over HTTPS on the LAN |
| `npm run content` | Rebuild `src/content/*.json` from `db/*.sql` |
| `npm run build` | Typecheck and production build (with service worker) |
| `npm run icons` | Regenerate PWA icons from `public/logo.svg` |

## Before going beyond personal testing

- Register a **reCAPTCHA Enterprise** key for the web app in App Check and set
  `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY`. Debug tokens are for your own devices only.
- Capacitor (native shell, real call screen) is planned for v2.
