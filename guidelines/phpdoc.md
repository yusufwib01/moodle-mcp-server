<!-- slug: phpdoc -->

# PHPDoc Guidelines (Moodle)

> **Status:** Stub. Fill in from Moodle dev docs + personal review notes.

## Key rules

- Every function/method needs a PHPDoc block: short description, `@param` for each argument with type, `@return` type.
- Use `@since` when adding a function in a specific Moodle version.
- Use full type names with namespace for classes (e.g. `\core\hook\after_config`).

## Common review findings

- Missing `@return` on functions that return non-void.
- `@param` types disagreeing with the actual signature (Moodle prefers signature types as source of truth, PHPDoc as supplement).
- Generic descriptions like "Adds an instance" — describe what changes and what it returns.

## References

- TODO: link Moodle dev docs PHPDoc page.
