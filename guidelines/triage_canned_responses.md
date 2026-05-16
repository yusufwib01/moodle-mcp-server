<!-- slug: triage_canned_responses -->

# Moodle Triage Canned Responses

Reusable templates for the Moodle tracker. Pick the matching template via `get_triage_canned_response`. Adapt the bracketed bits per issue.

---

## support_request

Closes a "how do I…" report.

```
Thanks for reporting this. The behaviour you describe is not a Moodle bug — it's
a request for help using Moodle.

Please ask in the Moodle Community forums:
https://moodle.org/community/

Closing as **Not a bug**.
```

---

## administrator_contact

Closes a request that belongs to the site's local admin team.

```
Thanks for the report. The issue you're describing is configuration-specific to
your Moodle site and is best handled by your local site administrator.

Closing as **Not a bug**.
```

---

## contributed_plugin

Closes / redirects an issue caused by a 3rd-party plugin.

```
Thanks for the report. This issue is caused by the third-party plugin
**[plugin name]** (component **[component]**), not Moodle core.

Please report it to the plugin maintainer via:
https://moodle.org/plugins/view.php?plugin=[component]

Closing as **Not a bug** (Moodle core).
```

---

## duplicate

Closes the issue and links the original.

```
Thanks for the report. This is a duplicate of [MDL-XXXXX], which is already
tracked.

Closing as **Duplicate**.
```

---

## unsupported_version

Closes an issue raised against a version Moodle no longer supports.

```
Thanks for the report. The version this affects (**[version]**) is no longer
supported. See https://moodledev.io/general/releases for the current support
matrix.

If you can reproduce the same behaviour on a supported version, please open a
new issue. Closing **[as Fixed / as Not a bug]**.
```

---

## en_fix

Closes a request that is purely a language string change in `en`.

```
Thanks for the report. Language-string changes are handled through Moodle's
translation workflow rather than the tracker. Please follow:
https://moodledev.io/general/community/translation

Closing as **Deferred**.
```

---

## translation_request

Closes a translation request (non-`en`).

```
Thanks for the report. Translations are managed through AMOS rather than the
tracker. Please coordinate with the language pack maintainer at:
https://lang.moodle.org/

Closing as **Deferred**.
```

---

## already_possible

Closes a "feature request" that's already supported by existing functionality.

```
Thanks for the suggestion. This is already possible in Moodle:

[brief description of how, with link to docs]

Closing as **Not a bug**.
```

---

## triaged_bug

Confirms a bug and accepts it into the backlog.

```
Confirmed. Reproduced on **[version]** in **[component]**.

Marking as **Triaged**. Priority set to **[priority]**.
```

---

## triaged_improvement

Confirms an improvement request.

```
Thanks for the suggestion. This is a reasonable improvement.

Marking as **Triaged** with type **Improvement**, priority **[priority]**.
```

---

## triaged_security

Confirms and elevates a security issue.

```
Confirmed as a security issue. Setting the issue security level appropriately
and engaging the security team. Further communication will happen in private.

Marking as **Triaged**.
```

---

## need_more_info

Requests additional information from the reporter.

```
Thanks for the report. To investigate further I need:

- Exact Moodle version (e.g. 5.2.1+).
- Steps to reproduce on a sandbox / clean install.
- Any error messages from `error_log` / browser console.
- Screenshot or screencast of the unexpected behaviour.

Marking as **Triaging in progress** while we wait for these.
```
