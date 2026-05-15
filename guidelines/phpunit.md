<!-- slug: phpunit -->

# PHPUnit Guidelines (Moodle)

> **Status:** Stub. Fill in from Moodle dev docs + personal CLR notes.

## Key rules

- Extend `advanced_testcase` for tests that touch the DB; call `$this->resetAfterTest()`.
- Use Moodle's data generators (`$this->getDataGenerator()`) rather than raw `$DB->insert_record` in setup.
- Group related assertions; one logical behaviour per test method.

## Common review findings

- Forgetting `resetAfterTest()` — leaks DB state into the next test.
- `assertEquals` on objects without overriding `__equals` semantics — prefer `assertSame` or compare specific fields.
- Test name describes what's tested, not what's asserted (`test_user_can_save_quiz_attempt` not `test_save_works`).

## References

- TODO: link Moodle PHPUnit docs.
