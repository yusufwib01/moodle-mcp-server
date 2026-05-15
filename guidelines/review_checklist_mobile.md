<!-- slug: review_checklist_mobile -->

# Review Checklist — Mobile app (Moodle)

Covers impact on the Moodle mobile app. Reference: Peer review category 11.

## Tracker labels

- Patch carries `affects_mobileapp` label if web services / WS-exposed data / pre-rendered content used by app changes.

## Web services

- Any new `db/services.php` entries follow naming + capability conventions.
- Existing WS function signatures unchanged (breaking WS = mobile breakage). Add a new function instead.
- Returned structures stable; no field renames in stable branches.

## Pre-rendered content

- Quiz / Lesson / Forum pre-rendered HTML respects the app's whitelist of tags + classes.
- No JS-only interactions on content the app renders statically.

## Settings + UI

- Global settings consumed by the app exposed via the mobile settings API.
- New strings translated for the app's lang pack (check `moodle-app` lang/en.json equivalent).

## Test plan

- Manual test plan in the tracker includes steps to verify in the app (or explicitly notes "no app impact").

## Common review findings

- Web service signature changed in place — silently breaks app on older versions.
- New feature added without `affects_mobileapp` label, app team learns at release time.
- Pre-rendered HTML uses tags the app strips.
