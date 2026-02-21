# Ralph Wiggum Loop Integration

This project uses the Ralph Wiggum loop methodology for autonomous implementation. Each phase has:
- A SPEC file defining object models, interfaces, and exit criteria
- A PROMPT file for the loop iteration
- A completion token: `<promise>PHASE_N_COMPLETE</promise>` (or `PHASE_A1_COMPLETE` etc.)
- A failure token: `<promise>NEEDS_HUMAN</promise>` (document issue in BLOCKERS.md)

On each iteration: read the prompt, check current state, implement or fix, run tests, emit completion token if all tests pass.
