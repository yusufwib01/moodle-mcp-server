<!-- slug: upgrade_notes -->

# Upgrade Notes Guidelines (Moodle)

> **Status:** Stub. Fill in from Moodle dev docs + personal review notes.

## Key rules

- Every behaviour change touches the component's `upgrade.txt` with a bullet under the current development version.
- Bump `$plugin->version` in `version.php` for any schema change or behaviour-affecting fix.
- For DB changes, add a corresponding `upgrade.php` block with a savepoint and `xmldb_*_upgrade` updated.

## Common review findings

- Missing `upgrade.txt` note even though behaviour changed.
- Version bumped but no matching `upgrade.php` savepoint, causing failed re-runs.
- New columns added to `install.xml` without an upgrade path for existing installs.

## References

- TODO: link Moodle upgrade.txt convention docs.
