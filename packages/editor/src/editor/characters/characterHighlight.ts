/**
 * Visual treatment for character-name highlights on the script canvas. Only
 * `underline` exists today; `fill` / `fill-text` are reserved for a future
 * user-facing intensity setting. The active mode is exposed as the
 * `data-character-highlight` attribute on the editor root, and each mode's look
 * is a CSS block scoped by that attribute — no JS branching per mode.
 */
export type CharacterHighlightMode = 'underline' | 'fill' | 'fill-text';

export const CHARACTER_HIGHLIGHT_ATTR = 'data-character-highlight';

export const DEFAULT_CHARACTER_HIGHLIGHT: CharacterHighlightMode = 'underline';
