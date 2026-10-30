# AGENTS.md — Lucid

Instructions for AI coding agents (Claude Code, Codex, Cursor, etc.) working in this repo. Read this before changing anything.

## What Lucid is

Lucid is a React Native (Expo) app that lets students ask questions and get answers **fully offline**, using a small LLM that runs on the phone. Many users are on low/mid-range Android phones, limited storage, and unreliable or expensive data. Every decision should respect that.

**Core promise:** after the one-time model download, the app works with airplane mode on. Never break this.

## Tech stack

- Expo (SDK: 58), TypeScript (strict), Expo Router (file-based routing)
- **Development build required** — Expo Go cannot load the native LLM module. Run with `npx expo run:android` / `npx expo run:ios`.
- New Architecture enabled (required by on-device LLM libraries)
- LLM runtime: `react-native-nobodywho` (GGUF models via llama.cpp: Qwen, Gemma, Llama 3.2, SmolLM2, etc.), quantized Q4_K_M by default
- Local storage: `expo-sqlite` (chats, messages, knowledge packs with FTS5), `expo-file-system` (model files)
- State: Zustand
- Styling: NativeWind (`className`) with tokens from the `@theme` block in `src/global.css` only (Tailwind v4: no `tailwind.config.js`) — see `docs/system-design.md`
- Auth: Firebase Authentication (React Native Firebase, modular API) + Google Sign-In + email/password. The Firebase ID token is the JWT — see `docs/auth.md`

## Setup

New machine or fresh project: follow `docs/setup.md` to install v1 dependencies and config files.

## Knowledge packs and eval data

Lesson content and test questions come from open-licensed sources, built by scripts in `tools/packs/` — see `docs/packs.md`. Never add content without a license entry; SciQ and GSM8K are eval-only and never shipped.

## UI

Screen designs live in `docs/lucid-design/design/screens/` (visual reference only). To build or change screens, follow `docs/ui.md`; translate design values to tokens with its table.

## Commands

```bash
npm install
npx expo prebuild          # after adding/changing native modules or app.json plugins
npx expo run:android       # dev build on Android
npx expo run:ios           # dev build on iOS
npm run lint
npm run typecheck          # tsc --noEmit
npm test
npm run check:tokens      # no hex, rgb() or arbitrary values in app code
```

Run `lint`, `typecheck`, `test` and `check:tokens` before saying a task is done.

## Project structure

```
src/
  app/                  # Expo Router screens only (thin: layout + wiring)
    (auth)/             # sign-in
    (tabs)/             # Home, Ask, Cards, History, Library (Settings opens from the avatar)
    onboarding/         # first run, model download
  components/           # reusable UI (see docs/system-design.md) — no business logic
  features/             # feature modules: auth/, chat/, models/, knowledge/, history/
    <feature>/
      components/       # feature-specific UI
      hooks/
      services/         # pure logic, no React
      types.ts
  llm/                  # the ONLY place that imports the LLM runtime
    engine.ts           # load/unload, generate, stop, stream tokens
    prompts.ts          # system prompts & templates
    models.ts           # model catalog (id, url, size, sha256, minRamGB)
  db/                   # SQLite schema, migrations, queries
  utils/
  global.css            # color tokens (@theme, light + dark); no tailwind.config.js in Tailwind v4
```

## Roadmap

Features ship in versions — see `docs/roadmap.md`. Version 2 (scan, voice, practice) is specified in `docs/lucid-handoff/v2.md` (designs in `docs/lucid-handoff/design/`). Only build features in the **current version** (v2). If a task needs a feature from a later version, stop and ask.

## Rules for the LLM layer

1. **Isolate the runtime.** Only `src/llm/` imports `react-native-nobodywho`. Everything else talks to `engine.ts`. This keeps the runtime swappable.
2. **One model loaded at a time.** Release the context before loading another. Release on app background if memory is tight.
3. **Always stream** tokens to the UI, and always support **Stop**. Interrupt generation before a screen unmounts.
4. **Never block the JS thread** with long work; show progress for model load (it can take several seconds).
5. **Check the device first.** Before download/load, check free storage and RAM against `models.ts` `minRamGB`. Recommend the smaller model on weak phones.
6. **Downloads must be resumable**, verified by checksum, and stored in the app's document directory. Show size before downloading and warn on mobile data.
7. Keep context short: small models degrade with long prompts. Trim history to the last N turns and cap knowledge-pack context.
8. **Honesty in prompts:** the system prompt must tell the model to say when it isn't sure, and the UI must show a short "AI can be wrong — check your textbook" note. When answers use knowledge packs, show the source.

## Subject specialization

Lucid specializes in the major high school subjects (Math, Science, English, Filipino, Araling Panlipunan/Social Studies, plus General). The full spec is in `docs/subjects.md`.

- Subject config, prompts, auto-detect, and the eval set live in `src/llm/subjects/`. Don't hard-code subject prompts anywhere else.
- Every prompt = shared rules + subject prompt + (optional) reference notes + question. Keep the system prompt under ~250 tokens.
- Math and science arithmetic is verified with an offline calculator (`mathjs`). Never trust the model's arithmetic.
- After changing a prompt, model, or retrieval setting, run the subject eval set and report the pass rate per subject.

## Authentication

Full spec in `docs/auth.md`. The essentials:

- Only `src/features/auth/` imports `@react-native-firebase/auth` or the Google Sign-In library. Everything else uses `useAuth()`.
- Signed-in state comes from the persisted Firebase user, which is available offline. An expired ID token while offline must **never** sign the student out or block the Ask screen.
- Never create or sign JWTs in the app. Use `getIdToken()` right before a request to our own backend; the backend verifies it with the Firebase Admin SDK.
- Never log tokens or store the Firebase ID token yourself. A backend-issued token, if any, goes in `expo-secure-store` only.
- Collect only uid, name, email and photo. Key local data by `uid`.

## Offline rules

- No network calls at runtime except: Google sign-in and token refresh, model download, knowledge-pack download, voice-pack download (v2), and (opt-in) update checks.
- Camera photos and voice recordings never leave the phone and are deleted right after use (v2).
- No analytics, crash reporting, or telemetry that sends user questions anywhere. Student questions never leave the device.
- Every screen must render and work in airplane mode. Test it.

## Code conventions

- TypeScript strict; no `any` without a comment explaining why.
- Functional components + hooks. Screens in `app/` stay thin.
- Styling: NativeWind `className` only. Colors are limited to `primary`, `ink`, `paper` plus status `default`, `success`, `warning`, `danger` (shades via opacity, e.g. `text-ink/60`). **No hex values, no inline `style` for colors/fonts/spacing, no arbitrary values** like `p-[13px]` or `bg-[#123]`. If a token is missing, add it to `docs/system-design.md` and `src/global.css` first.
- Use components from `src/components/` before creating new ones. If you add one, document it in `docs/system-design.md`.
- Every interactive element: `accessibilityLabel`, `accessibilityRole`, min touch target 44×44.
- Support light and dark mode and dynamic font scaling.
- Lists use `FlatList`/`FlashList`, never `.map()` inside a `ScrollView` for long data.
- Database changes go through a numbered migration in `src/db/migrations/`.
- Small, focused commits; describe the "why".

## Performance budget (target: low-end Android, ~4 GB RAM)

- Default model ≤ ~1.5B params, 4-bit quantized
- Cold start to interactive UI < 2 s (model loads lazily after UI shows)
- First token visible < 3 s on the reference device
- App bundle (without model) as small as possible; models are downloaded, never bundled

## Testing

- Unit-test `services/`, `db/`, and prompt building (pure functions).
- Mock `src/llm/engine.ts` in component tests — never load a real model in tests.
- Mock `src/features/auth/service.ts` in component tests — never call Firebase in tests.
- Manual check before merging LLM changes: airplane mode, low-storage device, stop mid-answer, background/foreground during generation.

## Don't

- Don't add a backend or cloud sync unless explicitly asked. Login is Firebase with Google or email/password, plus the offline profile (`docs/auth.md` §5) — don't add other providers without asking.
- Don't send student questions or answers to Firebase or any server.
- Don't import the LLM runtime outside `src/llm/`.
- Don't bundle model files in the app binary.
- Don't add a dependency that requires network at runtime.
- Don't remove the "AI can be wrong" notice.
- Don't push on github just commit when user give permission.
