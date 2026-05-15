<!-- slug: review_checklist_security -->

# Review Checklist — Security (Moodle)

> **Status:** Stub. Fill in from Moodle dev docs + personal CLR notes.

## Capability + access checks

- Every entry point asserts capability via `require_capability` or `has_capability` early.
- `require_login()` is called before any DB read of user-scoped data.
- Context resolution matches the data: course context for course data, module context for module data.

## CSRF + session

- Form submissions validate `sesskey()`; AJAX endpoints set `external_api` requirements.
- New external functions declare correct `services.php` registration and `\external_api` parameter validation.

## Input handling

- All inbound parameters pass through `required_param` / `optional_param` with explicit `PARAM_*` types.
- File uploads handled via `file_save_draft_area_files` with size/extension limits.
- Output escapes via `s()`, `format_string`, or Mustache (`{{value}}` not `{{{value}}}` unless explicitly safe).

## References

- TODO: link Moodle security canonical docs.
