<!-- slug: review_checklist_general -->

# Review Checklist — General (Moodle)

Covers both peer review and integration review. Based on https://moodledev.io/general/development/process/peer-review (17 categories) plus integration-phase items from https://moodledev.io/general/development/process/integration/clr.

For deep dives, also load the topic-specific checklists: `db`, `security`, `accessibility`, `privacy`, `mobile`, `performance`, `documentation`, `git`, `third_party`.

## 1. Syntax

- Follows Moodle coding style (PSR-12 + Moodle additions).
- Function/variable names: snake_case for functions, camelCase for namespaced class methods, descriptive not generic.
- Every public function/method has PHPDoc with `@param` types and `@return`.
- No deprecated functions used in new code; deprecated functions deprecated per Moodle policy (see `deprecation.md`).
- Superglobals (`$_GET`, `$_POST`, `$_SESSION`) accessed via `required_param` / `optional_param` / Moodle session helpers, not directly.

## 2. Output

- Render through `$OUTPUT` and Mustache templates; no inline `echo` of HTML.
- Generated HTML validates as HTML5.
- No inline styles in markup; styles live in component CSS / theme.
- Bootstrap + theme classes used over custom CSS where applicable.
- Output buffering kept minimal.
- Markup respects RTL (no hardcoded `left:`/`right:`).

## 3. Component library

- Any new UI feature targeting Moodle core (4.0+) must be documented in the component library with examples + descriptions.

## 4. Icons

- New icons follow size/design/format guidelines.
- Live in correct folder (`pix/`); no redundant concepts.

## 5. Language

- New `$string['key']` use Moodle naming conventions.
- Help strings get `_help` suffix; helper strings get `_helplink` suffix where required.
- No hard-coded user-facing text — always `get_string()`.
- Stable-branch changes preserve string IDs (don't rename existing keys).

## 6. Accessibility

- WCAG 2.1 AA contrast; tested with automated tool (axe / Pa11y).
- Valid semantic HTML.
- All controls keyboard-operable; tab order logical.
- Screen reader labels via `aria-label`/`aria-labelledby` where needed.

See `review_checklist_accessibility.md` for full list.

## 7. Databases

- Calls minimised; no N+1 patterns.
- SQL compatible with all supported engines (MySQL/MariaDB, PostgreSQL, MS SQL).
- Always parameterised; no string concatenation of user input.

See `review_checklist_db.md` for full list.

## 8. Performance and clustering

- Filesystem/database/cache access efficient.
- No expensive operations on hot paths (page load, every request).
- Cluster-safe: no reliance on local disk for shared state, sessions correctly handled.

See `review_checklist_performance.md` for full list.

## 9. Security

- `require_login()` called early on every entry point.
- `require_capability` / `has_capability` checks for any user-scoped action.
- `sesskey()` validated on every form/POST endpoint.
- Inputs through `required_param` / `optional_param` with explicit `PARAM_*` types.
- Output escaped via `s()`, `format_string`, or Mustache `{{var}}`.

See `review_checklist_security.md` for full list.

## 10. Privacy

- New tables storing user-identifiable data have a `classes/privacy/provider.php` implementing the Privacy API.
- Data export + deletion mechanisms cover all new fields.
- Data collection minimised; only what's needed.

See `review_checklist_privacy.md` for full list.

## 11. Moodle mobile app

- Component carries `affects_mobileapp` tracker label when patch touches mobile-relevant code.
- Web services updated if mobile uses them.
- Global settings exposed to app via `core_get_user_dates`-style APIs.
- App testing steps in the test plan.

See `review_checklist_mobile.md` for full list.

## 12. Third-party code

- License GPL-compatible.
- Listed in `thirdparty.xml` with version + URL.
- Upgrade documentation present.
- No duplicated functionality already in Moodle core.

See `review_checklist_third_party.md` for full list.

## 13. Documentation

- PHPDoc comments useful, not just generated boilerplate.
- `upgrade.txt` updated for behaviour/schema changes.
- Tracker labels appropriate (`docs_required`, `ui_change`, `affects_mobileapp`).
- Deprecation noted per policy (see `deprecation.md`).

See `review_checklist_documentation.md` for full list.

## 14. Git

- Branch follows Moodle naming (`MDL-XXXXX_main` etc).
- Commits rebased to clean history; logical separation per commit.
- Authorship preserved (no squashing other people's commits without attribution).
- Each supported branch covered (main + relevant stable).

See `review_checklist_git.md` for full list.

## 15. Testing instructions and automated tests

- Manual test instructions formatted per Moodle convention (Numbered steps, expected results).
- PHPUnit coverage for logic changes.
- Behat coverage for UI changes.
- Evidence in tracker that tests pass locally.

## 16. Overall completeness

- Patch scope matches issue scope; no scope creep.
- Fix is comprehensive — not just the reported symptom.
- Related areas of code considered (cross-component impact).
- Component maintainer involved if change is in their area.
- Version number bumped if behaviour/schema changed.

## Integration review additions

- **Target branch validation** — patch lands on the branches Moodle's backport policy requires. Use `get_backport_targets` to confirm.
- **Backwards compatibility** — public APIs preserved; breaking changes justified in `upgrade.txt`.
- **In-situ review** — verify the patch behaves correctly when combined with other already-integrated changes (cross-issue impact).
- **Workflow state** — confirm the issue is in the integration queue (`Waiting for review` → `Review in progress` → `Waiting for Push`).
- **Maintainer assignment** — component matches; correct maintainer in CC.
