# Just Enough Context: Teaching Claude to test with Playwright.

## Companion repo for the talk.

📊 [Slides](#) · 🎥 [Recording](#) · 📖 [Command reference](docs/commands.md)

If you're here straight after the session, the two-minute version is below. Everything you watched is reproducible from this repo.

---

## The idea

Most context problems are filing problems. Each layer answers exactly one question — which is why none of them has to be long.

1. Does **every** task need it? -> `AGENTS.md`: loaded every session, keep it short.
2. Do **some** tasks need it? -> A **Skill**: Loaded only when the task matches.
3. Only true **right now**? -> **CLI**: Fetched on demand, stays on disk.
4. Only true **today**? -> Your prompt. The task you want Claude to perform for you.

The failure mode isn't too little context or too much. It's the right fact in the wrong place.

---

## What's here

- [`tests/AGENTS.md`](tests/AGENTS.md) — the always-on layer. Short on purpose. **Start here.**
- [`tests/.claude/skills/`](tests/.claude/skills/) — `playwright-cli`, `playwright-trace`, `implement-test-case` and `skill-creator`
- [`docs/smoke-test-plan.md`](docs/smoke-test-plan.md) — plain-language test plan, the demo's input
- [`docs/commands.md`](docs/commands.md) — every command, prompt and skill from the talk, in demo order
- [`docs/todo-app.md`](docs/todo-app.md) — what the app does, including the deliberate oddities
- `app/` — the todo app under test
- `tests/specs/` — the suite, written to the conventions in `tests/AGENTS.md`

`AGENTS.md` is real, not an example. It's the file this repo actually runs on, the only way to
tell whether it works.

---

## Run it

```bash
git clone https://github.com/nora-weisser/ai-assisted-testing-demo
cd ai-assisted-testing-demo
npm install
npm run app:up
```

Then open:

- The app -> http://localhost:3000
- Swagger documentation -> http://localhost:3000/api/docs

Run the suite with `npm test`, and stop everything with `npm run app:down`.

Needs NodeJS, Docker and a coding agent with shell access (Claude Code, Copilot CLI, or Cursor).

---

## Commands, prompts and skills

Everything I typed on stage is in one file, in the order I run it. Follow it top to bottom to
reproduce the whole demo:

**[docs/commands.md](docs/commands.md)**

- Installing the CLI and all four skills
- Seeing what the agent actually receives from a page
- The exact prompts, including the run-it-twice `AGENTS.md` comparison
- Debugging a failing test from its trace
- Stepping through a live test with `--debug=cli`

---

## Resources

- [agents.md](https://agents.md) — the format, stewarded by the Linux Foundation's Agentic AI Foundation
- [How Contexts Fail](https://www.dbreunig.com/2025/06/22/how-contexts-fail-and-how-to-fix-them.html) — poisoning, distraction, confusion, clash
- [IFScale](https://arxiv.org/abs/2507.11538) — instruction-following degradation at scale
- [Context window simulator](https://code.claude.com/docs/en/context-window) — interactive, shows what actually fills a window
- [Tool search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool) — how tool definitions get deferred
- [Claude marketplace](https://claudemarketplaces.com/skills) — published skills, worth reading before installing
- [Playwright best practices skill](https://github.com/currents-dev/playwright-best-practices-skill) — a community skill for this exact job
- [playwright-cli](https://github.com/microsoft/playwright-cli) — the CLI used throughout this repo
- [Agent CLI documentation](https://playwright.dev/agent-cli/introduction) — official docs for it
- [playwright-mcp](https://github.com/microsoft/playwright-mcp) — official CLI vs MCP guidance
- [MCP vs CLI token efficiency](https://www.checklyhq.com/blog/mcp-vs-cli-token-efficiency/) — 2026 re-measurement

## Find me

[Blog](https://noraweisser.com/) ·
[LinkedIn](https://www.linkedin.com/in/eleonora-belova/) ·
[GitHub](https://github.com/nora-weisser) ·
[Free mentoring via Women Coding Community](https://mentorship.womencodingcommunity.com/mentorship/mentors?keyword=Eleonora%20Belova)

Questions, corrections, and better numbers than mine are all welcome, open an issue.
