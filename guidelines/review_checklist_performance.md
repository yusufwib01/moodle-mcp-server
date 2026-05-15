<!-- slug: review_checklist_performance -->

# Review Checklist — Performance + clustering (Moodle)

Reference: Peer review category 8.

## DB access

- No N+1 patterns: prefer `get_records_sql` with `IN` or joined queries over loops of `get_record`.
- Aggregations done in SQL where possible, not in PHP.
- Indexes exist for any new WHERE / JOIN / ORDER BY columns (declared in `install.xml`).

## Caching

- Read-heavy, rarely-changing data cached via the Cache API (`\cache::make`).
- Cache definitions in `db/caches.php`; invalidation hooks wired to the data lifecycle.
- No PHP-level `static` caches that survive across requests in cluster (cluster-unsafe).

## Filesystem

- File operations go through `\stored_file` / file API; no direct `fopen` on shared storage.
- File downloads stream through `send_stored_file`, not `readfile`.

## Hot paths

- No expensive operations on every request: no DB queries in renderers, no remote calls in page header, no full-component scans in capability checks.

## Clustering

- No `flock` / local-disk locks on data that belongs to all nodes — use DB locks (`\moodle_database::get_session_lock`) or `lock_factory`.
- No reliance on `realpath` of the dataroot being node-local.
- Sessions stored in DB/cache, not on local disk.

## Common review findings

- Loop calls `$DB->get_record` per item — should be one `get_records_sql`.
- New page makes 10 separate WS calls — should batch via `external_multiple_structure`.
- File written to `$CFG->dataroot` directly instead of file API — breaks on object storage.
