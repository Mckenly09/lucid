@AGENTS.md

# Claude Code — how to work in this repo

The project rules are in AGENTS.md (imported above). Extra rules load automatically from `.claude/rules/` when you open files in each area. The full specs live in `docs/` — read the one that matches the task before you start:

| Task | Read first |
|---|---|
| Screens, components, styling | `docs/ui.md`, `docs/system-design.md`, the matching file in `docs/lucid-design/design/screens/` |
| LLM, prompts, subjects, quiz generation | `docs/subjects.md` |
| Sign-in, tokens, user data | `docs/auth.md` |
| What to build now | `docs/roadmap.md` (current version only) |
| Installing packages | `docs/setup.md` |

## Workflow

1. **Plan first.** For anything bigger than a small fix, list the files you'll create or change and wait for "go".
2. **Small steps.** One screen or one feature at a time. Stop after each and summarize what changed.
3. **Never guess.** If a spec is unclear, a design is missing, or a package isn't installed, ask. Don't invent APIs; check the installed package's types or README in `node_modules`.
4. **Check before saying done:** `npm run typecheck && npm run lint && npm test && npm run check:tokens`. Fix failures; don't skip them.
5. **Check the UI visually** when a device or emulator is connected (see the `build-screen` skill).
6. **Keep docs in sync.** New component → add it to `docs/system-design.md`. New dependency → tell me why before installing.
