/**
 * Visual treatment for character names on the script canvas, driven by the
 * script's `visual.characterDecoration` setting. The active mode is exposed as
 * this attribute on the editor root, and each mode's look is a CSS block scoped
 * by it — no JS branching per mode.
 */
export const CHARACTER_HIGHLIGHT_ATTR = 'data-character-highlight';
