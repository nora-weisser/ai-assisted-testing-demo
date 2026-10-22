## Prompt

{{TEST_FILE}} is flaky.

Please do the following:

1. Reproduce it with `--repeat-each=20` and report the pass count. If it never
   fails that way, run the file several times without `--repeat-each`, then with
   `--workers=1`.
2. Rerun with `--trace on` so passing runs keep a trace too. Read a failing and a
   passing trace with `npx playwright trace …`, and compare the network activity
   and the DOM at the failing step.
3. Read `docs/app.md` for how the feature behaves, and check the test against
   `AGENTS.md` and the fixtures.
4. State the root cause in one sentence.
5. Fix the test. No retries, sleeps, longer timeouts, serial mode or single worker.
6. Prove the fix with `--repeat-each=20` and `npm run typecheck`.

Expected output:

- Before / after pass counts
- Root cause in one sentence, with the trace evidence
- The diff
- Why the fix removes the cause instead of making it rarer

## Example

tests/specs/flaky/f02-favourite.spec.ts is flaky. Reproduce it, find the root cause in
the traces, fix it without retries or waits, and prove the fix over 20 runs.
