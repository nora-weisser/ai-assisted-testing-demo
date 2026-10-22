## Prompt

Please use Playwright CLI to run an interactive annotation session for this page: {{URL}}.

1. Open the page with Playwright CLI.
2. Enable annotation mode using `show --annotate`.
3. Pause and wait for my visual annotations.
4. After I finish annotating, read the generated annotation artifacts from `.playwright-cli` (snapshot and image files).
5. Summarize each annotation as:
   - Observed issue
   - Likely root cause
   - Recommended fix
   - Test update needed (if any)
6. If code changes are needed, propose concrete updates for Playwright page objects and tests using this repository conventions.

Expected output:
- A numbered list of issues based on annotations
- Proposed UI or test fixes
- Follow-up questions only if something is ambiguous

## Example

Please use Playwright CLI to run an interactive annotation session for this page: http://localhost:3000
