# AGENTS.md — Lucid

Instructions for AI coding agents (Claude Code, Codex, Cursor, etc.) working in this repo. Read this before changing anything.

## What Lucid is

Lucid is a React Native (Expo) app that lets students ask questions and get answers **fully offline**, using a small LLM that runs on the phone. Many users are on low/mid-range Android phones, limited storage, and unreliable or expensive data. Every decision should respect that.

**Core promise:** after the one-time model download, the app works with airplane mode on. Never break this.

## Tech stack

- Expo (SDK: `<fill in>`), TypeScript (strict), Expo Router (file-based routing)
- **Development build required** — Expo Go cannot load the native LLM module. Run with `npx expo run:android` / `npx expo run:ios`.
- New Architecture enabled (required by on-device LLM libraries)
- LLM runtime: `<fill in: llama.rn | react-native-executorch>`
  - llama.rn → GGUF models (Qwen, Gemma, Llama 3.2, SmolLM2, etc.), quantized Q4_K_M by default
  - react-native-executorch → `.pte` models via `useLLM`
- Local storage: `expo-sqlite` (chats, messages, knowledge packs with FTS5), `expo-file-system` (model files)
- State: `<fill in: Zustand | Jotai | React Context>`
- Styling: NativeWind (`className`) with tokens from `tailwind.config.js` + `global.css` only — see `systemdesign.md`

## Commands

```bash
npm install
npx expo prebuild          # after adding/changing native modules or app.json plugins
npx expo run:android       # dev build on Android
npx expo run:ios           # dev build on iOS
npm run lint
npm run typecheck          # tsc --noEmit
npm test
```

Run `lint`, `typecheck`, and `test` before saying a task is done.

## Project structure

```
app/                    # Expo Router screens only (thin: layout + wiring)
  (tabs)/               # Ask, History, Library, Settings
  onboarding/           # first run, model download
src/
  components/           # reusable UI (see systemdesign.md) — no business logic
  features/             # feature modules: chat/, models/, knowledge/, history/
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
global.css              # color tokens as CSS variables (light + dark)
tailwind.config.js      # maps tokens to NativeWind classes
```

## Rules for the LLM layer

1. **Isolate the runtime.** Only `src/llm/` imports `llama.rn` / `react-native-executorch`. Everything else talks to `engine.ts`. This keeps the runtime swappable.
2. **One model loaded at a time.** Release the context before loading another. Release on app background if memory is tight.
3. **Always stream** tokens to the UI, and always support **Stop**. Interrupt generation before a screen unmounts.
4. **Never block the JS thread** with long work; show progress for model load (it can take several seconds).
5. **Check the device first.** Before download/load, check free storage and RAM against `models.ts` `minRamGB`. Recommend the smaller model on weak phones.
6. **Downloads must be resumable**, verified by checksum, and stored in the app's document directory. Show size before downloading and warn on mobile data.
7. Keep context short: small models degrade with long prompts. Trim history to the last N turns and cap knowledge-pack context.
8. **Honesty in prompts:** the system prompt must tell the model to say when it isn't sure, and the UI must show a short "AI can be wrong — check your textbook" note. When answers use knowledge packs, show the source.

## Subject specialization

Lucid specializes in the major high school subjects (Math, Science, English, Filipino, Araling Panlipunan/Social Studies, plus General). The full spec is in `subjects.md`.

- Subject config, prompts, auto-detect, and the eval set live in `src/llm/subjects/`. Don't hard-code subject prompts anywhere else.
- Every prompt = shared rules + subject prompt + (optional) reference notes + question. Keep the system prompt under ~250 tokens.
- Math and science arithmetic is verified with an offline calculator (`mathjs`). Never trust the model's arithmetic.
- After changing a prompt, model, or retrieval setting, run the subject eval set and report the pass rate per subject.

## Offline rules

- No network calls at runtime except: model download, knowledge-pack download, and (opt-in) update checks.
- No analytics, crash reporting, or telemetry that sends user questions anywhere. Student questions never leave the device.
- Every screen must render and work in airplane mode. Test it.

## Code conventions

- TypeScript strict; no `any` without a comment explaining why.
- Functional components + hooks. Screens in `app/` stay thin.
- Styling: NativeWind `className` only. Colors are limited to `primary`, `ink`, `paper` plus status `default`, `success`, `warning`, `danger` (shades via opacity, e.g. `text-ink/60`). **No hex values, no inline `style` for colors/fonts/spacing, no arbitrary values** like `p-[13px]` or `bg-[#123]`. If a token is missing, add it to `systemdesign.md` and `tailwind.config.js` first.
- Use components from `src/components/` before creating new ones. If you add one, document it in `systemdesign.md`.
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
- Manual check before merging LLM changes: airplane mode, low-storage device, stop mid-answer, background/foreground during generation.

## Don't

- Don't add a backend, login, or cloud sync unless explicitly asked.
- Don't import the LLM runtime outside `src/llm/`.
- Don't bundle model files in the app binary.
- Don't add a dependency that requires network at runtime.
- Don't remove the "AI can be wrong" notice.
