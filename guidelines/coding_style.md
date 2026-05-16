<!-- slug: coding_style -->

# Coding Style Guidelines (Moodle)

> **Status:** Stub. The canonical content lives in the Moodle dev docs; this is a quick pointer + per-review notes.

## Key rules

- Moodle uses PSR-12 with additions: file header `<?php` and `defined('MOODLE_INTERNAL') || die();` (legacy sites still).
- Class names: `mod_<plugin>_<purpose>` for plugin classes; namespaced classes preferred for new code.
- Snake_case for function names (`quiz_add_instance`), camelCase for method names inside namespaced classes.

## Common review findings

- New code adds 4-space indentation but mixes tabs/spaces in modified lines.
- Long lines exceeding 132 chars (soft limit) without a break.
- Inline `<?php` blocks inside templates — should live in renderers.

## References

- Canonical: https://moodledev.io/general/development/policies/codingstyle
- TODO: capture exceptions Moodle integration review enforces beyond the canonical doc.
