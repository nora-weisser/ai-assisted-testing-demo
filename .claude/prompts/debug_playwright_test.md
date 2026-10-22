## Prompt

The {{TEST_FILE}} test is failing.

Please do the following:

1. Run the failing test with headed browser and CLI debug mode enabled.
2. Read any installed Playwright CLI skills that help with debugging sessions.
3. Attach to the active Playwright CLI session.
4. Inspect runtime state using snapshots, step-over, and relevant CLI commands.
5. Identify the root cause of the failure.
6. Suggest a concrete fix in test code or page object code.
7. If useful, propose additional assertions or locator improvements to prevent regressions.

Expected output:
- Root cause summary
- Exact file level fix proposal
- Why the fix works
- Optional follow-up checks

## Example

The tests/demo.spec.ts test is failing.

Please run Playwright with --debug=cli, read the installed Playwright CLI skills, attach to the debugging session, investigate the failure, and suggest a fix.