# Focus visibility

Implements points 1 and 2 of the approved focus audit.

- One application signal: `:root[data-focus-ring-visible]`, initially absent.
- Mount the tracker once above application gates and routes so keyboard visibility survives route changes and covers the first-run preview notice.
- Pointer down hides rings. Tab/Shift+Tab and unmodified arrows/Home/End outside text entry reveal rings only when focus actually moves (including virtual focus).
- Typing, activation, Escape, shortcuts and unsolicited programmatic focus preserve the current visibility. A Tab consumed by the editor does not enable rings.
- A trapped Tab wrapping onto the sole control in a dialog also counts as navigation; it must remain visible even though browsers omit a new `focusin` event.
- Handled navigation outside text entry may complete in the next animation frame (custom submenus). Unhandled keys and editor-consumed Tab expire at keyup.
- All product CSS reads the application signal, using `:focus`, `:focus-within` or RAC `[data-focused]` as appropriate. Preserve hover and text-editing affordances.
- Guard product CSS against native `:focus-visible` and RAC `[data-focus-visible]`; marketing and documentation retain their own policies.
- Preserve existing focus management and ring appearance. Modal restore/initial focus changes (audit point 3) are out of scope.

Approaches considered in the audit: native heuristics inherit visibility from text entry; React Aria also treats activation and editor-consumed keys as keyboard navigation. The approved custom tracker confirms navigation with a focus change and gives all components the same policy.
