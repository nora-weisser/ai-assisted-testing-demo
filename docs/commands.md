# Command reference

Every command, prompt and skill from the talk, in the order I run them. Follow it top to bottom
to reproduce the demo, or jump to the step you care about.

---

## 0. Before you start

```bash
npm run app:up            # http://localhost:3000
cd tests && npm install
npm run test:smoke        # 5 green tests — the baseline
npm run test:flaky        # the exercises — these fail on purpose (step 4)
```

Stop everything with `npm run app:down` from the repo root when you're finished.

Start your agent **in `tests/`**: that's where `CLAUDE.md` imports `AGENTS.md`.

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

The other three are already in this repo, hand-written rather than installed — copy the folder and they work anywhere:

- [`tests/.claude/skills/implement-test-case/`](../tests/.claude/skills/implement-test-case/) — the workflow used in step 3
- [`tests/.claude/skills/fix-flaky-test/`](../tests/.claude/skills/fix-flaky-test/) — the workflow used in step 4
- [`tests/.claude/skills/skill-creator/`](../tests/.claude/skills/skill-creator/) — writes and evaluates the others

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

`TC-S01` to `TC-S05` are already automated in [`tests/specs/smoke.spec.ts`](../tests/specs/smoke.spec.ts).
`TC-S06` onwards are not — see [`docs/test-plan.md`](test-plan.md). Start a fresh agent session
**in `tests/`** (that's where `CLAUDE.md` loads `AGENTS.md`) and send exactly this:

```
Implement test case TC-S06 from the docs/test-plan.md test plan
```

The `implement-test-case` skill should fire on its own — the description is the trigger.

Read the result like a reviewer. Role-based locators, the `api` and page-object fixtures reused,
the `TC-S06:` title format and `@smoke` tag, none of which was in the prompt. Then check the part
that matters most here:

- Does it wait for the `PUT /api/favourites/…` response before `page.reload()`? The favourite
  button is optimistic, so `aria-pressed="true"` is no proof the server stored anything.
- Did it run `--repeat-each=20` and report the pass count?

Prove it yourself:

```bash
cd tests && npx playwright test specs/<new-file>.spec.ts --repeat-each=20
```

**Run it twice.** Repeat in a fresh session with Layers 1 and 2 switched off. Both have to go:
the skill tells the agent to read `AGENTS.md`, and carries the timing rules itself. Without
"Favourites are optimistic" in context, the likely result is a test that asserts `aria-pressed`,
reloads straight away, and fails about one run in four.

```bash
# off
mv tests/CLAUDE.md tests/CLAUDE.md.off
mv tests/.claude/skills/implement-test-case /tmp/implement-test-case
# back on
mv tests/CLAUDE.md.off tests/CLAUDE.md
mv /tmp/implement-test-case tests/.claude/skills/implement-test-case
```

Other cases with a timing trap: `TC-S08` (a `202` payment), `TC-S09` (debounced search),
`TC-S10` (a hold that expires — the good answer uses `page.clock`).

---

## 4. Fix a flaky test from its traces

Five tests in `tests/specs/flaky/` pass *sometimes* — see [`docs/exercises.md`](exercises.md).
Exercise 01 is the one for the stage: it fails most runs, but not all.

```bash
cd tests
npx playwright test specs/flaky/f01-search.spec.ts              # one run — may pass
npx playwright test specs/flaky/f01-search.spec.ts --repeat-each=20 --trace on
```

Look at a failing trace yourself first, so you know what the agent is working from:

```bash
npx playwright trace open test-results/<failing-run>/trace.zip
npx playwright trace actions --errors-only    # which step failed
npx playwright trace requests --grep api      # two GET /api/events — which one did the test wait for?
npx playwright trace snapshot <action-id>     # the DOM at that step: six cards, not two
npx playwright trace close
```

Then hand it over, in a fresh session in `tests/`:

```
specs/flaky/f01-search.spec.ts is flaky. Find the root cause and fix it.
```

The `fix-flaky-test` skill should fire on its own. For more structure, use the prompt
[`tests/.claude/prompts/fix_flaky_test.md`](../tests/.claude/prompts/fix_flaky_test.md):

```
@.claude/prompts/fix_flaky_test.md specs/flaky/f01-search.spec.ts
```

What a good answer looks like: the root cause in one sentence (it waited for the page's initial,
unfiltered load), `waitForResponse` and `allTextContents()` replaced by a web-first
`toHaveText([...])`, and 20 of 20 green — reported, not claimed.

**Why this matters more than it looks.** Without the trace, an agent debugging a failure has one
`error-context.md` from the moment things broke. From that it will construct a confident,
plausible explanation, which is sometimes right. The trace gives it the whole sequence instead, so
it can point at the step where things actually diverged.

Reset the exercise before the next attempt:

```bash
git checkout -- specs/flaky/
```

---

## 5. Step through a live test

For when a recording isn't enough and you want the agent *inside* the test. From `tests/`:

```bash
npx playwright test specs/flaky/f01-search.spec.ts --headed --debug=cli
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

Ask the agent, with the prompt
[`tests/.claude/prompts/debug_playwright_test.md`](../tests/.claude/prompts/debug_playwright_test.md):

```
@.claude/prompts/debug_playwright_test.md specs/flaky/f01-search.spec.ts
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

Reading list: [Resources](../README.md#resources) in the README.
