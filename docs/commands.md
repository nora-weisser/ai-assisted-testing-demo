# Command reference

Every command, prompt and skill from the talk, in the order I run them. Follow it top to bottom
to reproduce the demo, or jump to the step you care about.

---

## 0. Before you start

```bash
npm install
npm run app:up            
```

- The app -> http://localhost:3000
- Swagger documentation -> http://localhost:3000/api/docs

```bash
npm test                  # the suite; two specs fail on purpose
npm run app:down          # stop everything when you're finished
```

Two failures are the demo material, not a broken checkout: `DEBUG_TRACE` (step 3) and
`DEBUG_CLI` (step 4).

---

## 1. Install the CLI and the skills

The CLI itself, globally:

```bash
npm i -g @playwright/cli
playwright-cli --version
```

Then the skills. Each one installs differently, which is the point — a skill is just a folder,
so anything that can write a folder can ship one.

```bash
playwright-cli install --skills       # -> playwright-cli/ : the CLI's own capabilities
npx playwright trace install-skill    # -> playwright-trace/ : reading a trace from the CLI
```

`install --skills` writes the CLI's capabilities reorganised into workflows, layered so an agent reads only the part a task needs. Rename the parent folder if your tooling expects `.agents/` or `.github/` instead of `.claude/skills/`.

The other two are already in this repo, hand-written rather than installed — copy the folder and they work anywhere:

- [`tests/.claude/skills/implement-test-case/`](../tests/.claude/skills/implement-test-case/) — the workflow used in step 2
- [`tests/.claude/skills/skill-creator/`](../tests/.claude/skills/skill-creator/) — writes and evaluates the other three

Check what you've got, and read one before you trust it:

```bash
ls -1 tests/.claude/skills/
cat tests/.claude/skills/implement-test-case/SKILL.md
```

**Read skills before installing them.** An installed skill is instructions your agent will follow. Treat it like a dependency you're about to ship, because that's what it is.

**The description is the trigger.** It's the only part always in context, and it decides whether the skill ever fires. If a skill isn't activating, the description is almost always the bug, not the model. Write it as a trigger ("use when the user needs to…"), not as a summary.

The format, in full:

```
.claude/skills/my-skill/
  SKILL.md          name, description, instructions
  references/       deeper guides, read on demand
  scripts/          deterministic helpers
  assets/           templates and fixtures
```

---

## 2. See what the agent actually receives

```bash
playwright-cli open http://localhost:3000/ --headed
playwright-cli snapshot
wc -l .playwright-cli/*.yml
```

The rest of the exploration surface:

- `playwright-cli open <url>` — start a session, headless by default
- `playwright-cli open <url> --headed` — same, with a visible browser, useful when *you* are watching
- `playwright-cli snapshot` — compact page summary plus stable refs (`e13`, `e14`)
- `playwright-cli click <ref>` — click by reference
- `playwright-cli fill <ref> "text"` — type into a field
- `playwright-cli screenshot` — capture to disk

```bash
playwright-cli click e13
```

Run `playwright-cli --help` for the full surface — it's larger than this.

---

## 3. Watch context change the answer

`TC-S01` to `TC-S03` are already automated in [`tests/specs/smoke.spec.ts`](../tests/specs/smoke.spec.ts).
`TC-S04` onwards are not. Start a fresh agent session and send exactly this:

```
Implement test case TC-S04 from the smoke-test-plan.md test plan
```

While implementing a test case, it should follow the skill `tests/.claude/skills/implement-test-case/SKILL.md`.

Read the result like a reviewer. Role-based locators, seeded through the API, existing fixtures
reused, the `TC-S04:` title format, none of which was in the prompt.

---

## 4. Let it debug a failure from the trace

`DEBUG_TRACE` fails on purpose. Produce a trace:

```bash
npx playwright test -g "DEBUG_TRACE" --trace on
```

Look at it yourself first, so you know what the agent is working from:

```bash
npx playwright show-report                        # the HTML report — for humans
npx playwright trace open <path-to-trace.zip>     # text representation of the trace
```

Once a trace is open:

- `npx playwright trace actions` — every action, in order
- `npx playwright trace snapshot <n>` — the DOM at step *n*, not just the end state
- `npx playwright trace requests` — network activity

Then hand it over, in a fresh session:

```
The test case "DEBUG_TRACE" broke, please investigate the trace.
```

**Why this matters more than it looks.** Without the trace skill, an agent debugging a failure
has one `error_context.md` file from the moment things broke.
From that it will construct a confident, plausible explanation, which is sometimes right. The
trace gives it the whole sequence instead, so it can point at the step where things actually
diverged.

---

## 5. Step through a live test

For when a recording isn't enough and you want the agent *inside* the test. `DEBUG_CLI` is the
one to use.

```bash
npx playwright test -g "DEBUG_CLI" --headed --debug=cli
```

This starts the test, pauses it, and prints a **session id**. Then, from another terminal:

```bash
playwright-cli attach "$SID"
playwright-cli -d="$SID" step-over        # one Playwright instruction at a time
playwright-cli -d="$SID" snapshot         # inspect the paused page
playwright-cli -d="$SID" click e13        # act on it
```

Every exploration command from step 2 works against the paused test, not just against a browser
you opened by hand.

Would you debug this way? Probably not, you have an IDE. But an agent can't click a breakpoint
or drag a timeline, and this is the same debugger in a form it can operate.

Ask the agent:

```
The tests/specs/debug-demo.spec.ts test is failing.

Please run Playwright with --debug=cli, read the installed Playwright CLI skills,
attach to the debugging session, investigate the failure, and suggest a fix.
```
OR with prompt [`tests/.claude/prompts/debug_playwright_test.md`](../tests/.claude/prompts/debug_playwright_test.md):
```
@tests/.claude/prompts/debug_playwright_test.md  debug-demo.spec.ts
```
---

## 6. Bonus: annotate a page and get fixes back

Not in the talk if I run short. Full prompt in
[`tests/.claude/prompts/annotation_feedback.md`](../tests/.claude/prompts/annotation_feedback.md):

```
Please use Playwright CLI to run an interactive annotation session for this page:
http://localhost:3000
```

OR with the prompt:
```
@tests/.claude/prompts/annotation_feedback.md  http://localhost:3000

```

The agent opens the page with `show --annotate`, waits while you mark it up, then reads the
artefacts back out of `.playwright-cli/` and proposes test changes.

---

## A caveat worth taking seriously

Everything here has a shelf life measured in months. The advice that MCP burns your context was
accurate when written and largely stale within a quarter. Some of this repo will age the same
way.

The tools will change. The question underneath doesn't:

> **What is the smallest set of things this agent needs in order to be right?**

Reading list: at the end of [tests/AGENTS.md](../tests/AGENTS.md#resources).
