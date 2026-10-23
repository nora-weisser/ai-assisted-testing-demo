# Command reference

Every command, prompt and skill from the talk, in the order I run them. Follow it top to bottom to reproduce the demo, or jump to the step you care about.

| # | Step | Time |
| --- | --- | --- |
| 0 | [Before you start](#0-before-you-start) | before the session |
| 1 | [What fills the context window](#1-what-fills-the-context-window) | 4 min |
| 2 | [AGENTS.md: the always-on layer](#2-agentsmd-the-always-on-layer) | 6 min |
| 3 | [Inside the playwright-cli skill](#3-inside-the-playwright-cli-skill) | 5 min |
| 4 | [playwright-cli, hands-on](#4-playwright-cli-hands-on) | 8 min |
| 5 | [A custom skill: implement-test-case](#5-a-custom-skill-implement-test-case) | 4 min |
| 6 | [Task 1: implement a test case](#6-task-1-implement-a-test-case) | 10 min |
| 7 | [Flaky tests: from evidence to fix](#7-flaky-tests-from-evidence-to-fix) | 18 min |
| 8 | [Homework](#8-homework) | 2 min |
| | Buffer, for a slow or wandering agent | 3 min |

**60 minutes in total.** In steps 6 and 7, send the prompt first, then explain the skill or the checklist while the agent works. Run both agent tasks once before the talk and keep the sessions, in case a live run stalls.

---

## 0. Before you start

You need Node.js 22, Docker **running** (start Docker Desktop first), and a coding agent with shell access. The demo uses Claude Code.

```bash
git clone https://github.com/nora-weisser/ai-assisted-testing-demo
cd ai-assisted-testing-demo

npm run app:up            # Front Row on http://localhost:3000 (needs Docker)
cd tests && npm install
npm run test:smoke        # 5 green tests: the baseline
cd ..
```

If `npm run app:up` fails:

- "Cannot connect to the Docker daemon": Docker isn't running yet.
- "port is already allocated": something else is on port 3000. Find it with `lsof -i :3000` (or `docker ps`) and stop it.

Install the CLI and its skill once per machine:

```bash
npm i -g @playwright/cli
playwright-cli --version
playwright-cli install --skills       # -> .claude/skills/playwright-cli/
npx playwright trace install-skill    # -> .claude/skills/playwright-trace/
```

Start your agent **at the repo root**. That's where `CLAUDE.md` and `.claude/skills/` live. Terminal commands below run from the repo root. Blocks that need `tests/` start with `cd tests` and end by going back with `cd ..`.

Stop everything with `npm run app:down` when you're finished.

---

## 1. What fills the context window

Everything the agent knows about your session lives in one context window: your instructions, every file it reads, every command output, its own replies. Some of it loads before you type anything. The interactive walkthrough shows a session filling up step by step: [code.claude.com/docs/en/context-window](https://code.claude.com/docs/en/context-window).

Start a fresh session at the repo root and look before doing anything:

```
claude
/context
```

What's already there:

- **Loaded at startup:** the system prompt, `CLAUDE.md` (and `AGENTS.md`, which it imports), auto memory, MCP tool names, and **only the name and description** of each skill.
- **Loaded as the agent works:** every file it reads, every command's output, and a skill's full instructions once a task matches its description.

Run `/context` again after any task in this demo and compare. The difference is what the work cost.

Keep the window for the task at hand:

- `/clear` between unrelated tasks. Old conversation costs tokens on every message.
- `/compact focus on <topic>` before a long task, to choose what the summary keeps.
- Send big searches to a subagent, so the file contents stay in its window, not yours.

**The question for the rest of the talk:** what is the smallest set of things this agent needs in order to be right, and where should each one live?

---

## 2. AGENTS.md: the always-on layer

[`AGENTS.md`](../AGENTS.md) is a plain markdown file of project instructions for coding agents. It's an open format ([agents.md](https://agents.md)) that Claude Code, Copilot, Cursor and others read.

**How it's loaded.** At session start, from the working directory and the directories above it. Claude Code reads `CLAUDE.md`. When a repo has both files, it reads only `CLAUDE.md`. So this repo's `CLAUDE.md` is one line that imports `AGENTS.md`, and every agent gets the same file:

```bash
cat CLAUDE.md             # @AGENTS.md
wc -l AGENTS.md           # under 70 lines, on purpose
```

In a session, `/context` lists it under memory files, and `/memory` shows which instruction files are in play. It's also re-read from disk after `/compact`, so it never falls out of context.

**What it consists of**, and why each part is there:

| Section | What it holds | Why it's always loaded |
| --- | --- | --- |
| Role | Who the agent is, and the scope: `tests/` only, `app/` is read-only | Stops it "fixing" the app to make a test pass |
| Layout | Where fixtures, page objects and specs live; path aliases; how to run things | Saves it searching the repo every session |
| How the app behaves | Latency, debounced search, optimistic favourites, expiring holds, background payment, shared seats | The facts that make a test flaky when the agent doesn't know them |
| MUST / SHOULD / WON'T | Locator priority, web-first assertions, fixtures, tags; no sleeps, no retries, no `workers: 1` | The team's rules, so you don't repeat them in every prompt |
| Environment | `BASE_URL`, test-only routes | What a fresh checkout needs to run |

**Rule of thumb:** if every task needs it, it goes here. If only some tasks need it, it goes in a skill (step 3). Every line here is paid for in every session, so keep it short.

---

## 3. Inside the playwright-cli skill

A skill is a folder. It needs one file, `SKILL.md`, with a name, a description and instructions. Anything else is extra detail the agent reads only when it needs it.

```bash
ls .claude/skills/
ls -R .claude/skills/playwright-cli/
head -5 .claude/skills/playwright-cli/SKILL.md
```

```
.claude/skills/playwright-cli/
  SKILL.md                 name, description, allowed tools, the command reference
  references/              in-depth guides, one per task
    playwright-tests.md      running and debugging Playwright tests
    request-mocking.md       mocking network calls
    tracing.md               recording traces
    test-generation.md       turning a session into test code
    ...                      10 guides in total
```

```yaml
---
name: playwright-cli
description: Automate browser interactions, test web pages and work with Playwright tests.
allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Bash(npm:*)
---
```

It loads in three levels, so the agent only pays for what the task needs:

1. **Description:** always in context (you saw it in `/context`). It's the trigger: the agent reads it to decide whether the skill is relevant.
2. **`SKILL.md` body:** loaded when a task matches. Here, the command reference.
3. **`references/*.md`:** read only when the task needs that topic. `SKILL.md` ends with a list that points to them:

```bash
grep -A12 "## Specific tasks" .claude/skills/playwright-cli/SKILL.md
wc -l .claude/skills/playwright-cli/SKILL.md .claude/skills/playwright-cli/references/*.md
```

About 400 lines in `SKILL.md` and about 1,600 in the references. None of it costs anything until it's needed.

**Read a skill before you install it.** It's instructions your agent will follow, so treat it like a dependency you're about to ship.

---

## 4. playwright-cli, hands-on

`playwright-cli` drives a real browser from the terminal. The agent uses exactly these commands, so what you see is what it reads. Snapshots land in `.playwright-cli/` (gitignored). The `eNN` refs below are from my run; read yours from your own snapshot.

**Open the app.** `--headed` so the room can watch:

```bash
playwright-cli open http://localhost:3000/ --headed
```

```
### Browser `default` opened with pid 93055.
### Ran Playwright code
await page.goto('http://localhost:3000/');
### Snapshot
- [Snapshot](.playwright-cli/page-2026-10-22T15-34-59-497Z.yml)
```

It replies with the code it ran and a *path* to a snapshot, not the page. The agent decides whether to read it. That's the token saving over MCP, in one line.

**Look at the page the way the agent does:**

```bash
playwright-cli snapshot
```

```yaml
# trimmed: wrapper elements and the other events left out
- heading "Upcoming events" [level=1] [ref=e7]
- searchbox "Search events" [ref=e10]
- status [ref=e11]: Showing 6 events
- list "Events" [ref=e12]:
  - listitem [ref=e13]:
    - heading "Late Night Jazz Trio" [level=2] [ref=e15]:
      - link "Late Night Jazz Trio" [ref=e16]
    - button "Favourite Late Night Jazz Trio" [ref=e22]: ♡
```

No HTML and no CSS: only role, accessible name and a ref. If a control has no name here, the agent can't reach it with `getByRole` either.

**Act by ref, then check only the part you need:**

```bash
playwright-cli fill e10 "jazz"
playwright-cli snapshot e11
```

```js
await page.getByRole('searchbox', { name: 'Search events' }).fill('jazz');
```

```yaml
- status [ref=e11]: Showing 2 events
```

You type a ref; what runs is a role-based locator, the same line a good test contains.

**Refs only live as long as the latest snapshot.** That one covered `e11` alone, so take a fresh one before clicking the favourite button:

```bash
playwright-cli snapshot
playwright-cli click e22
```

**Did the server get it?** The button says yes. Ask the network:

```bash
playwright-cli requests
```

```
4. [GET] http://localhost:3000/api/events => [200] OK
5. [GET] http://localhost:3000/api/events?q=jazz => [200] OK
6. [PUT] http://localhost:3000/api/favourites/late-night-jazz-trio => [204] No Content
```

The button flipped before the `PUT` came back. Remember that for step 6.

**Hand a locator to a test, then clean up:**

```bash
playwright-cli generate-locator e22   # getByRole('button', { name: 'Favourite Late Night Jazz Trio' })
playwright-cli close
```

Cheat sheet:

| Command | What it does |
| --- | --- |
| `playwright-cli open <url> [--headed]` | Start a session |
| `playwright-cli snapshot [ref]` | Accessibility tree with refs, whole page or one element |
| `playwright-cli click <ref>` / `fill <ref> "text"` / `press Enter` | Act on the page |
| `playwright-cli requests` / `request <n>` | Network so far, then one request in full |
| `playwright-cli console` | Browser console messages |
| `playwright-cli generate-locator <ref>` | The Playwright locator for an element |
| `playwright-cli close` | End the session |

`playwright-cli --help` lists the rest.

---

## 5. A custom skill: implement-test-case

[`implement-test-case`](../.claude/skills/implement-test-case/SKILL.md) is hand-written for this repo. It's the team's process for automating a case from the test plan:

```bash
cat .claude/skills/implement-test-case/SKILL.md
```

1. **Read before writing:** the case's line in the test plan, `AGENTS.md`, the app docs, the existing specs.
2. **Explore the real UI** with `playwright-cli` before writing any code, so roles, names and texts come from the page, not from guesses.
3. **Implement** with the project's fixtures, page objects and locator rules.
4. **Verify:** typecheck plus `--repeat-each=20`, and report the real pass count.

Its description says *when* to use it ("Use whenever a case ID from the test plan is to be automated"). That's why you won't need to name the skill in the prompt.

**Tip: make your own skill.**

1. Pick the most repetitive task you do every day.
2. Solve it once with the agent, in one session.
3. In that same session, ask the built-in `skill-creator` skill to turn it into a skill:

```
Use the skill-creator skill to turn what we just did into a reusable skill.
Follow the steps from this session, and write the description so it triggers
whenever I ask for this kind of task.
```

Then read the `SKILL.md` it wrote, and tighten the description. The description decides whether the skill ever fires.

---

## 6. Task 1: implement a test case

`TC-S01` to `TC-S05` are already automated in [`tests/specs/smoke.spec.ts`](../tests/specs/smoke.spec.ts). `TC-S06` onwards are not. See [`docs/test-plan.md`](test-plan.md):

> **TC-S06 — A favourite survives a reload.** Click **Favourite _event_** on any event, reload
> the page. The button still has `aria-pressed="true"`.

In a fresh session at the repo root, send exactly this:

```
Implement test case TC-S06 from the docs/test-plan.md test plan
```

The `implement-test-case` skill should fire on its own. Watch it open the browser with `playwright-cli` before writing code.

Read the result like a reviewer:

- Role-based locators, the page-object fixtures, the `TC-S06:` title and the `@e2e @smoke` tags, none of which was in the prompt.
- **The trap:** does it wait for the `PUT /api/favourites/…` response before `page.reload()`? The button flips before the server stores anything (step 4), so `aria-pressed="true"` proves nothing on its own.
- Did it run `--repeat-each=20` and report the pass count?

Prove it yourself:

```bash
cd tests
npx playwright test specs/<new-file>.spec.ts --repeat-each=20
cd ..
```

---

## 7. Flaky tests: from evidence to fix

Writing new tests is one part of the job. The other is the tests that already fail **sometimes**.

A **flaky test** passes on one run and fails on the next, with no change to the code. It almost always hides an assumption about timing or shared data that's true on a good day and false on a bad one. One green run proves nothing, so always measure:

```bash
cd tests
npx playwright test specs/flaky/f01-search.spec.ts                   # one run: may pass
npx playwright test specs/flaky/f01-search.spec.ts --repeat-each=20  # write down the pass count
```

### What a failed run leaves behind

Each failed run gets its own folder in `test-results/`, named after the test and the repeat:

```bash
ls test-results/
# flaky-f01-search-FLAKY-01--81ba6-z-shows-the-two-jazz-events-chromium-repeat2
# flaky-f01-search-FLAKY-01--81ba6-z-shows-the-two-jazz-events-chromium-repeat3
# ...
```

| File | What it gives you |
| --- | --- |
| `error-context.md` | One page of text about the failure: the error, the page at that moment, the failing line |
| `trace.zip` | The whole run: every action, network request and DOM snapshot, in order |
| `test-failed-1.png` | A screenshot of the failure |

### Reading error-context.md

```bash
cat test-results/<failed-run>/error-context.md
```

It's plain markdown in five sections. Here they are from a real failing run of exercise 01:

**1. Instructions:** a ready-made prompt. Playwright writes this file *for an AI to read*:

```
- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.
```

**2. Test info:** which test, and where it lives:

```
- Name: flaky/f01-search.spec.ts >> FLAKY-01: searching for jazz shows the two jazz events
- Location: specs/flaky/f01-search.spec.ts:4:5
```

**3. Error details:** what was expected, and what came back:

```
  Array [
    "Late Night Jazz Trio",
    "Jazz Under the Stars",
+   "Indie Rock Night",
+   "Beethoven: Symphony No. 9",
+   "Warehouse Techno",
+   "Folk on the Canal",
  ]
```

**4. Page snapshot:** the accessibility tree at the moment it failed, the same format as `playwright-cli snapshot` in step 4. This is the most useful part. Trimmed:

```yaml
- searchbox "Search events" [active] [ref=e10]: jazz
- status [ref=e11]: Showing 6 events
- list "Events" [ref=e12]:
  - listitem [ref=e13]: ... "Late Night Jazz Trio"
  - listitem [ref=e23]: ... "Jazz Under the Stars"
  - listitem [ref=e33]: ... "Indie Rock Night"
  ...
```

The search box already says `jazz`, but the status still says `Showing 6 events`. The search results hadn't arrived when the test read the list. The test waited for *a* response, just not the right one.

**5. Test source:** the test, with an arrow on the line that failed:

```
  16 |   await page.waitForResponse((response) => response.url().includes('/api/events'));
  17 |
  18 |   const titles = await eventsPage.cards.getByRole('heading').allTextContents();
> 19 |   expect(titles).toEqual(['Late Night Jazz Trio', 'Jazz Under the Stars']);
     |                  ^ Error: expect(received).toEqual(expected) // deep equality
```

**How to use it:**

- **Yourself:** read *Error details* for what broke, *Test source* for where, then *Page snapshot* for what the page looked like at that moment. Compare it with what the test assumed.
- **With any agent or chat:** paste the whole file. It already starts with instructions, the test and the page state, so you don't need to explain the context.
- **Know its limit:** it's one moment, the end. It can't show what happened before, like which response the test actually waited for. On its own, an agent builds a plausible story from it, which is sometimes right. For the sequence, you need the trace:

```bash
npx playwright show-trace test-results/<failed-run>/trace.zip   # the Trace Viewer, for humans
cd ..
```

### Hand a flaky test to the agent, with the trace

Two skills give the agent the whole story and a process to follow:

- [`playwright-trace`](../.claude/skills/playwright-trace/SKILL.md) (installed in step 0): read a trace from the terminal: actions, requests, console, DOM snapshots. A Trace Viewer the agent can operate.
- [`fix-flaky-test`](../.claude/skills/fix-flaky-test/SKILL.md) (hand-written for this repo): a workflow. Reproduce and count, read a failing and a passing trace, name the root cause in one sentence, fix it without retries or sleeps, and prove it over 20 runs.

```bash
cat .claude/skills/fix-flaky-test/SKILL.md
```

**The task.** Exercise 02: favourite an event, reload, and it's sometimes gone. In a fresh session at the repo root:

```
tests/specs/flaky/f02-favourite.spec.ts is flaky. Find the root cause and fix it.
```

`fix-flaky-test` fires on its own and loads `playwright-trace` when it reaches the traces. While it works, these are the commands it runs, from `tests/`:

```bash
npx playwright test specs/flaky/f02-favourite.spec.ts --repeat-each=20 --trace on

npx playwright trace open test-results/<failing-run>/trace.zip
npx playwright trace actions --errors-only    # which step failed
npx playwright trace requests --grep api      # when did the PUT finish, compared to the reload?
npx playwright trace snapshot <action-id>     # the DOM at that step
npx playwright trace close
```

For a stricter version, use the prompt in [`.claude/prompts/fix_flaky_test.md`](../.claude/prompts/fix_flaky_test.md):

```
@.claude/prompts/fix_flaky_test.md tests/specs/flaky/f02-favourite.spec.ts
```

What a good answer looks like:

- **Before and after:** about 5–9 failures in 20 runs before, 20 of 20 after, from a run it shows you.
- **Root cause in one sentence:** the favourite button is optimistic, so the reload sometimes starts before the `PUT` has been stored. The trace shows the `PUT` finishing after the reload's `GET /api/events`.
- **The fix:** wait for the `PUT` response before reloading. No sleeps, no retries, no bigger timeouts.

Watch for "fixes" that only make the flake rarer: a longer timeout, a `waitForTimeout`, a retry.

Reset before the next attempt:

```bash
git checkout -- tests/specs/flaky/
```

---

## 8. Homework

- **Fix exercise 01 with the agent:** the test from step 7. `tests/specs/flaky/f01-search.spec.ts is flaky. Find the root cause and fix it.` Does its explanation match what you read in `error-context.md`?
- **The other flaky tests:** exercises 03–05 in [`docs/exercises.md`](exercises.md), with hints. Exercise 05 is different: it only fails when tests run together, and `--repeat-each` hides it. Answers are on the `solutions` branch.
- **The other test cases:** `TC-S07` to `TC-S10` in [`docs/test-plan.md`](test-plan.md). `TC-S08` (a `202` payment) and `TC-S10` (an expiring hold: the good answer uses `page.clock`) have timing traps.
- **Turn context off:** redo step 6 in a fresh session without `CLAUDE.md` and the skill, and compare the test you get:

  ```bash
  cd "$(git rev-parse --show-toplevel)"   # the repo root, from wherever you are
  mv CLAUDE.md CLAUDE.md.off && mv .claude/skills/implement-test-case /tmp/
  # ...run step 6 again, then put them back:
  mv CLAUDE.md.off CLAUDE.md && mv /tmp/implement-test-case .claude/skills/
  ```

- **Write your own skill** for your most repetitive daily task, with `skill-creator` (step 5).
- **Going further:**
  - Step through a live test with the agent: `npx playwright test <spec> --headed --debug=cli`, then `playwright-cli attach <session-id>`. Prompt in [`.claude/prompts/debug_playwright_test.md`](../.claude/prompts/debug_playwright_test.md).
  - Annotate a page and get test changes back: `playwright-cli show --annotate`. Prompt in [`.claude/prompts/annotation_feedback.md`](../.claude/prompts/annotation_feedback.md).

---

Everything here has a shelf life measured in months. The tools will change. The question underneath doesn't:

> **What is the smallest set of things this agent needs in order to be right?**

Reading list: [Resources](../README.md#resources) in the README.
