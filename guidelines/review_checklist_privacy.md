<!-- slug: review_checklist_privacy -->

# Review Checklist — Privacy (Moodle)

Covers GDPR + Privacy API obligations. Reference: Peer review category 10.

## Privacy provider class

- Component that stores user-identifiable data has `classes/privacy/provider.php`.
- Provider implements `\core_privacy\local\metadata\provider` (declares what is stored) and `\core_privacy\local\request\plugin\provider` (export/delete) where applicable.
- Each new table declared via `add_database_table` in `get_metadata`.
- External data shipped to a third party declared via `add_external_location_link`.

## Data minimisation

- Only the data actually needed is stored.
- No PII duplicated when a foreign key would suffice.
- Logs/debug entries with user IDs respect the same boundaries.

## Export + delete

- `get_users_in_context` returns every user whose data the plugin holds for the given context.
- `export_user_data` covers every new table/field.
- `delete_data_for_user` and `delete_data_for_users` remove every new table/field.

## Tests

- `tests/privacy/provider_test.php` extends `provider_testcase` and covers the new metadata + delete paths.

## Common review findings

- New DB table added without privacy provider update.
- Export missing fields that were added later.
- Provider declares metadata but delete methods are no-ops.
