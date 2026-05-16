<!-- slug: behat -->

# Behat Guidelines (Moodle)

> **Status:** Stub. Fill in from Moodle dev docs + personal review notes.

## Key rules

- Place feature files under `<component>/tests/behat/`.
- Tag with `@<component_name>` (e.g. `@mod_quiz`) and any relevant feature tags.
- Reuse step definitions from `behat_data_generators` / `behat_general` before adding custom ones.

## Common review findings

- New `@javascript` scenarios where a non-JS path would do (slows CI).
- Hardcoded waits (`I wait "3" seconds`) — use `I wait until the page is ready` or step-specific waits.
- Inline string assertions that break under translation — prefer `should see` with identifiers.

## References

- TODO: link Moodle Behat docs.
