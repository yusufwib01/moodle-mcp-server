<!-- slug: review_checklist_accessibility -->

# Review Checklist — Accessibility (Moodle)

> **Status:** Stub. Fill in from Moodle dev docs + personal CLR notes.

## Markup semantics

- Headings follow document hierarchy (no skipping levels).
- Buttons are `<button>` (or `$OUTPUT->single_button`) — never `<a>` styled as a button for actions.
- Form fields have explicit `<label for>` associations.

## ARIA + state

- Custom widgets expose role/aria-* attributes via templates, not via JS hacks.
- Live regions (`aria-live="polite"`) used for asynchronous notifications.
- Focus management on modal open/close (return focus to invoker on close).

## Visual + keyboard

- Color contrast meets WCAG 2.1 AA via Moodle's theme variables; no hardcoded hex values.
- All interactive elements reachable + operable via keyboard (no `tabindex="-1"` on essential controls).
- No reliance on hover-only affordances.

## References

- TODO: link Moodle accessibility canonical docs.
