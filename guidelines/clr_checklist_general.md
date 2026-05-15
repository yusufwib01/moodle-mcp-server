<!-- slug: clr_checklist_general -->

# CLR Checklist — General (Moodle)

> **Status:** Stub. Fill in from Moodle dev docs + personal CLR notes.

## Patch hygiene

- Commit message references the MDL issue and matches Moodle conventions.
- One logical change per commit; no unrelated drive-by edits.
- No debug code, `var_dump`, or commented-out blocks left behind.

## Coding standards

- File follows Moodle coding style (PSR-12 with Moodle additions).
- New code adheres to `phpdoc.md`, `db_queries.md`, `output_api.md` guidelines.
- Strings externalised via `get_string()` with a corresponding lang entry.

## Tests + docs

- New behaviour has matching PHPUnit and/or Behat coverage.
- Component-level `upgrade.txt` updated when behaviour or schema changes.
- README / inline docs reflect any new public APIs.

## References

- TODO: link Moodle CLR checklist canonical doc.
