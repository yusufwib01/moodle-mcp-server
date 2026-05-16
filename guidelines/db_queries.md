<!-- slug: db_queries -->

# DB Queries Guidelines (Moodle)

> **Status:** Stub. Fill in from Moodle dev docs + personal review notes.

## Key rules

- Always use `$DB` (the moodle_database instance) — never raw PDO.
- Use placeholders, not string interpolation: `$DB->get_records_sql('SELECT ... WHERE id = ?', [$id])`.
- Pick the right helper: `get_record` (one expected), `get_records` (many), `get_record_sql` for custom SQL.

## Common review findings

- String concatenation of user input into SQL — instant block.
- Forgetting `SQL_PARAMS_NAMED`/`SQL_PARAMS_QM` semantics when mixing helpers.
- Using `$DB->execute` where a typed helper exists.

## References

- TODO: link Moodle DB layer docs.
