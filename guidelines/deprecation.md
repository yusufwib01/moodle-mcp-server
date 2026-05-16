<!-- slug: deprecation -->

# Deprecation Guidelines (Moodle)

> **Status:** Stub. Fill in from Moodle dev docs + personal review notes.

## Key rules

- Mark deprecated functions with the `@deprecated since X.Y` PHPDoc tag and call `debugging('foo() is deprecated, use bar()', DEBUG_DEVELOPER)`.
- Keep deprecated callers working for one full release cycle before removal.
- Add a note in the matching `upgrade.txt` and `lib/deprecatedlib.php` (or component-equivalent) where appropriate.

## Common review findings

- `@deprecated` tag without an accompanying `debugging()` call.
- Removing a function in the same release it was deprecated.
- Missing replacement guidance in the `debugging()` message.

## References

- TODO: link Moodle deprecation policy doc.
