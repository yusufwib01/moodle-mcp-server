<!-- slug: output_api -->

# Output API Guidelines (Moodle)

> **Status:** Stub. Fill in from Moodle dev docs + personal review notes.

## Key rules

- Render through `$OUTPUT` and Mustache templates; never `echo` HTML directly.
- Move HTML into `.mustache` files; pass data via a renderable class.
- Use core renderers (`render_pix_icon`, `render_action_link`) instead of hand-rolled markup.

## Common review findings

- Inline `echo '<div>...'` in handler files.
- Mixing concatenated strings + `html_writer` calls in the same function.
- Translatable strings hardcoded in PHP instead of `get_string()`.

## References

- TODO: link Moodle Output API doc.
