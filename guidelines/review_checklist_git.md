<!-- slug: review_checklist_git -->

# Review Checklist — Git (Moodle)

Reference: Peer review category 14.

## Branch naming

- Branch named `MDL-XXXXX_<branch>` (e.g. `MDL-12345_main`, `MDL-12345_405`).
- One branch per supported version touched (main + each backport target).

## Commit history

- Logical separation: one concept per commit, not one giant "fix everything" commit.
- Rebased onto current `main` (or target branch) — no merge commits.
- No fixup / WIP commits left in the final history.
- Commit subject prefix: `MDL-XXXXX <component>: <subject>` (lower-case after colon).

## Authorship + credit

- `git log --pretty=fuller` shows the original author for any cherry-picked / co-authored work.
- `Co-authored-by` trailers used for collaborative commits.
- No reauthoring of someone else's work without preserving credit.

## Each supported branch covered

- For bug fixes: branches for every currently supported stable (see `get_backport_targets`).
- For new features: usually `main` only.
- For security fixes: every supported stable + main, via the security workflow.

## Tag + push hygiene

- No accidental tags pushed.
- Force-push only on the developer's own branch — never on shared/integration branches.

## Common review findings

- Branch missing for one of the supported stables in the backport set.
- Squashed history erased an external contributor's commits.
- Merge commit between rebases breaks bisect.
