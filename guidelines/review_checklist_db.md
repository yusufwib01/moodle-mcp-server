<!-- slug: review_checklist_db -->

# Review Checklist — DB (Moodle)

> **Status:** Stub. Fill in from Moodle dev docs + personal review notes.

## Schema

- `install.xml` matches `upgrade.php` savepoints for the bumped version.
- New tables include a primary key, sensible NOT NULL defaults, and proper indexes.
- Foreign-key relationships described via `<KEYS>` blocks (Moodle does not enforce them but they document intent).

## Queries

- All user-derived values pass through placeholders (`?` or `:name`), never string concatenation.
- Helpers picked correctly: `get_record` (one), `get_records` (many), `record_exists` (boolean intent).
- Bulk operations use transactions (`$transaction = $DB->start_delegated_transaction()`).

## Upgrade

- Upgrade savepoints follow the `if ($oldversion < <version>)` pattern with `upgrade_mod_savepoint`.
- Drop/rename operations include rollback considerations or are documented as one-way.
- Data backfills tolerate being re-run (idempotent or guarded by version).

## References

- TODO: link Moodle DB layer canonical docs.
