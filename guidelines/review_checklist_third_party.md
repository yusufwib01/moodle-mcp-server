<!-- slug: review_checklist_third_party -->

# Review Checklist — Third-party code (Moodle)

Reference: Peer review category 12.

## Licensing

- License is GPLv3-compatible (MIT, BSD-2/3, Apache-2, GPLv2+ all compatible; LGPL with caveats).
- License header preserved in the imported files.

## Registration

- Entry added to the relevant `thirdparty.xml` (`<library>` with `<location>`, `<name>`, `<version>`, `<licenseversion>`, `<licensefile>`).
- Path under `thirdpartylibs/` or component-local `vendor/`-style folder per Moodle convention.

## Upgrade documentation

- `readme_moodle.txt` (or `README.md` per component convention) explains:
  - Where the library came from (URL).
  - Version pulled.
  - Local modifications (if any).
  - Update procedure.

## Security + duplication

- Run dependency security scanner (Moodle CI does this) — no known CVEs.
- Confirm Moodle core doesn't already ship equivalent functionality.

## Common review findings

- Library copied in but `thirdparty.xml` not updated, breaking GPL compliance audits.
- Local modifications without a README note, making the next upgrade painful.
- Adds a JS framework Moodle already ships (jQuery, AMD core).
