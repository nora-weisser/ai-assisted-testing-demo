# Just Enough Context: Teaching Claude to test with Playwright.

## Companion repo for the talk.

📖 [Command reference](docs/commands.md) · 🧪 [Exercises](docs/exercises.md)

If you're here straight after the session, the two-minute version is below. Everything you watched is reproducible from this repo.

First presented at the [BrowserStack Meetup Amsterdam: AI's Impact on QA](https://luma.com/browse-mtmg), August 2026, with a todo app. That version is tagged [`v1-meetup`](https://github.com/nora-weisser/ai-assisted-testing-demo/tree/v1-meetup).

---

## The idea

Most context problems are filing problems. Each layer answers exactly one question — which is why none of them has to be long.

1. Does **every** task need it? -> `AGENTS.md`: loaded every session, keep it short.
2. Do **some** tasks need it? -> A **Skill**: loaded only when the task matches.
3. Only true **right now**? -> The **CLI**: fetched on demand, stays on disk.

The prompt is just the task. Everything else the agent needs should already be in one of the three layers.

The failure mode isn't too little context or too much. It's the right fact in the wrong place.

---

## Two tasks, one app

**Front Row** is a small concert-ticket app that behaves like a real one: every API call takes 50–350 ms, search is debounced, favourites are optimistic, seat holds expire, payments are confirmed in the background, and seats are shared between customers.

- **Create a test case.** Automate `TC-S06` from the test plan. The trap: the favourite button flips before the server has saved it, so the obvious test is flaky.
- **Fix a flaky test.** Five tests in `tests/specs/flaky/` pass *sometimes*. Find the cause in the traces, fix it without retries or sleeps, prove it over 20 runs.

The same three layers do both jobs: the facts in `AGENTS.md` stop the agent writing a flaky test, and the same facts help it find the cause when one exists.

---

## What's here

- [`tests/AGENTS.md`](tests/AGENTS.md) — the always-on layer. Short on purpose. **Start here.** [`tests/CLAUDE.md`](tests/CLAUDE.md) imports it for Claude Code.
- [`tests/.claude/skills/`](tests/.claude/skills/) — `implement-test-case`, `fix-flaky-test`, `playwright-cli`, `playwright-trace` and `skill-creator`
- [`tests/.claude/prompts/`](tests/.claude/prompts/) — reusable prompts
- [`docs/test-plan.md`](docs/test-plan.md) — plain-language test plan, the input for creating tests
- [`docs/exercises.md`](docs/exercises.md) — the five flaky-test exercises, with starter prompts and hints
- [`docs/commands.md`](docs/commands.md) — every command, prompt and skill from the talk, in demo order
- [`docs/app.md`](docs/app.md) — what the app does, its API, and its timing
- `app/` — Front Row, the app under test
- `tests/specs/` — the smoke suite and the flaky exercises

Answers to the exercises live on the [`solutions`](https://github.com/nora-weisser/ai-assisted-testing-demo/tree/solutions) branch. Try first.

`AGENTS.md` is real, not an example. It's the file this repo actually runs on, the only way to
tell whether it works.

---

## Run it

```bash
git clone https://github.com/nora-weisser/ai-assisted-testing-demo
cd ai-assisted-testing-demo
npm run app:up                 # http://localhost:3000 (Docker)
cd tests && npm install
npm run test:smoke             # the stable baseline: 5 green tests
npm run test:flaky             # the exercises, 20 repeats each — these fail on purpose
```

Stop everything with `npm run app:down` from the repo root.

Needs Node.js 22, Docker and a coding agent with shell access (Claude Code, Copilot CLI, or Cursor). Start the agent **in `tests/`**, so it loads `AGENTS.md`.

---

## Commands, prompts and skills

Everything I typed on stage is in one file, in the order I run it. Follow it top to bottom to
reproduce the whole demo:

**[docs/commands.md](docs/commands.md)**

- Installing the CLI and the skills
- Seeing what the agent actually receives from a page
- Creating a test case, and the run-it-twice context comparison
- Fixing a flaky test from its traces
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

## License

[MIT](LICENSE), except the third-party skills in `tests/.claude/skills/`, which keep their own licences:
`playwright-cli` and `playwright-trace` are installed from Microsoft's Playwright tools (Apache 2.0),
and `skill-creator` ships with its own [Apache 2.0 licence](tests/.claude/skills/skill-creator/LICENSE.txt).

## Find me

[Blog](https://noraweisser.com/) ·
[LinkedIn](https://www.linkedin.com/in/eleonora-belova/) ·
[GitHub](https://github.com/nora-weisser) ·
[Free mentoring via Women Coding Community](https://mentorship.womencodingcommunity.com/mentorship/mentors?keyword=Eleonora%20Belova)

Questions, corrections, and better numbers than mine are all welcome, open an issue.
