# Editor Search Design

**Date:** 2026-09-22

## Goal

Add instant, literal text search to the script editor. The first release searches case-insensitively, highlights every occurrence, lets the user move between results, expands a collapsed scene when needed, and keeps keyboard focus in the search field.

The design must remain extensible for later filters such as block type and case sensitivity without coupling matching logic to the toolbar UI.

## Scope

### Included

- Instant literal text search within editor text blocks.
- Case-insensitive matching by default.
- Result count and active-result position.
- Previous/next navigation by buttons and keyboard.
- Global `Cmd+F` / `Ctrl+F` shortcut that opens and focuses the editor search.
- Passive and active result highlighting using background color only.
- Automatic expansion of a collapsed scene that contains the active result.
- An empty search-options popover wrapper for future filters.
- Internal search criteria prepared for case sensitivity and block-type filters.

### Not included

- Replace functionality.
- Regular expressions, whole-word matching, fuzzy matching, or diacritic folding.
- Filter controls inside the options popover.
- Matches spanning multiple block nodes.
- Persistence of the search query outside the current editor session.

This is a UI and editor-runtime change. It does not change the stored script document shape or semantics, so `SCRIPT_DOCUMENT_SCHEMA_VERSION` must not be incremented.

## Existing UI Contract

The search control remains on the right side of the editor toolbar. From left to right it contains:

1. Search query input.
2. Search status area.
3. Previous and next result buttons.
4. Search-options popover toggle.

When the query is empty, the status area shows the search icon. Once the query is non-empty, it shows `current/total`; a query with no matches shows `0/0`. Navigation controls are disabled when there are no results.

The clear button is shown for a non-empty query. A short vertical divider separates it from the result counter. The options button opens the existing empty, padded popover wrapper at the width of the complete search control.

## Architecture

Search is implemented as a dedicated custom Tiptap extension, `SearchExtension`. It follows the plugin-state and decoration approach used by Tiptap's official find-and-replace extension, while intentionally using application-specific navigation behavior.

Reference implementation:

- https://github.com/ueberdosis/tiptap/tree/main/packages/extension-find-and-replace

The extension is registered in the editor's extension composition and owns:

- the current search criteria;
- the ordered list of matches;
- the active match index;
- the search decorations;
- commands that update criteria and navigate results.

The editor toolbar remains a consumer of extension state. It does not calculate or separately store results. `useEditorState` derives the counter and enabled state directly from the plugin state, avoiding duplicate React and ProseMirror sources of truth.

Search is kept separate from `EditorRuntimeExtension`: it has its own state lifecycle, matching algorithm, commands, and decorations, and will grow independently as filters are added.

## Search State and Data Model

The plugin state contains:

```ts
type SearchCriteria = {
    query: string;
    caseSensitive: boolean;
    blockTypes: readonly ScriptBlockNodeType[] | null;
};

type SearchResult = {
    from: number;
    to: number;
    blockId: string | null;
    blockType: ScriptBlockNodeType;
};

type SearchState = {
    criteria: SearchCriteria;
    results: readonly SearchResult[];
    currentIndex: number;
    decorations: DecorationSet;
};
```

`currentIndex` is `-1` when there is no active result. Results are stored in document order.

The first UI version always sends `caseSensitive: false` and `blockTypes: null`. Keeping these values in the criteria makes future filter UI a state update rather than an architectural change.

## Matching Rules

- An empty query produces no matches and no decorations.
- The query is treated as literal text; regex-significant characters are escaped.
- Default matching is case-insensitive and Unicode-aware.
- Diacritics are exact: for example, `e` does not match `é`.
- Whitespace is meaningful.
- Matches are non-overlapping.
- A match may span adjacent text segments separated by inline marks such as bold, italic, underline, or character tags.
- A match never crosses a text-block boundary.
- When `blockTypes` is non-null, only eligible text blocks are searched.

The matcher is a pure module independent of React and Tiptap commands. It creates a block-local text representation together with position mappings back to ProseMirror document positions. This preserves matches across inline marks without allowing a match to leave its block.

## Plugin Updates

Search state is recalculated when:

- a transaction changes the search criteria through plugin metadata; or
- `transaction.docChanged` is true while the query is non-empty.

No debounce is used in the first version: both query changes and document edits update results immediately. The algorithm traverses only text blocks and can be optimized later if profiling shows a real issue.

When a document edit occurs, the extension maps the active result position through the transaction. If the same occurrence still exists, it remains active. If it disappears, the closest following match becomes active, wrapping to the first match when necessary.

## Initial Active Result

When the query changes from empty to non-empty, or changes to a different query, the extension selects the first match at or after the editor selection anchor captured before focus moved into the search input. If no later match exists, it wraps to the first result in the document.

This editor position is remembered separately from navigation. Search navigation never replaces it with a ProseMirror selection because focus and caret remain in the search input.

## Commands

The extension exposes commands equivalent to:

```ts
setSearchCriteria(criteria: SearchCriteria): Command;
clearSearch(): Command;
goToNextSearchResult(): Command;
goToPreviousSearchResult(): Command;
```

Criteria and navigation updates are transmitted through plugin metadata. Navigation wraps cyclically at both ends.

Unlike the official Tiptap extension, these commands do not set a `TextSelection`, focus the editor, or alter the user's caret. Their visible effect is limited to changing the active decoration, expanding a relevant scene, and scrolling the result into view.

## Toolbar and Keyboard Behavior

- Typing updates `criteria.query` immediately.
- `Enter` navigates to the next result.
- `Shift+Enter` navigates to the previous result.
- Button navigation has the same cyclic behavior.
- Clearing the input calls `clearSearch`, removes decorations, and restores the search icon.
- `Cmd+F` on macOS and `Ctrl+F` elsewhere are registered through `@tanstack/react-hotkeys`.
- The shortcut prevents the browser find dialog, focuses the editor search input, and selects its current contents.
- Search navigation leaves focus in the input and does not modify the editor selection.
- The shortcut is active for this editor surface only and must not intercept find while another application-level text field or modal owns the interaction context.

The search input and the composed search control expose refs as needed so the editor toolbar can focus and select the input without querying the DOM by CSS selector.

## Collapsed Scenes and Scrolling

All document text is searched, including content currently hidden inside collapsed scenes.

When navigation activates a result in a collapsed scene:

1. Identify the containing scene from the existing scene-collapse state.
2. Call the existing `expandScene` command.
3. Wait until the expanded content has been rendered.
4. Locate the active search decoration and scroll it into the central visible area of the editor canvas.

If the scene is already open, only the scroll step runs. Expanding a scene does not move focus out of the search input.

The active decoration receives a stable data attribute so scrolling can target it without relying on visual class names.

## Visual Treatment

- Every match uses a subtle background color.
- The active match uses a more saturated version of the same color.
- Search highlights have no border, outline, or box shadow.
- Highlight styling must remain distinct from the browser text selection and from editor focus-flash decorations.
- Decoration styles live with the editor extension or editor surface, not in the generic UI package.

The existing search control retains its white active background and subtle border without an active box shadow.

## Accessibility

- Previous and next buttons retain explicit accessible names.
- The result counter uses a polite live region so result-count changes are announced without interrupting typing.
- The empty-query search icon is decorative and does not duplicate the input label.
- Disabled navigation is expressed through native disabled button state.
- The options toggle exposes its expanded state and relationship to the popover.
- Highlight colors must maintain sufficient visual distinction in the product theme without being the sole programmatic indication of the current result; the live counter communicates the active position.

## Error and Edge Cases

- A non-empty query with zero results displays `0/0` and disables navigation.
- Clearing the query removes all search state visible in the document.
- Deleting the active occurrence selects the closest following occurrence; if none remain, the state becomes `0/0`.
- Navigation with zero results is a no-op.
- Regex metacharacters in the query are treated as ordinary characters.
- Composition input must not trigger navigation; Enter handling respects IME composition state.
- Destroying or recreating the editor removes plugin decorations and does not retain stale DOM references.

## Testing Strategy

### Pure matcher tests

- Case-insensitive default matching.
- Opt-in case-sensitive matching at the data-model level.
- Exact diacritics.
- Literal regex metacharacters.
- Multiple non-overlapping occurrences.
- Matches across inline marks.
- No matches across block boundaries.
- Block-type filtering.
- Correct ProseMirror positions.

### Extension tests

- Criteria updates through transaction metadata.
- Recalculation after document changes.
- First result chosen from the remembered editor position with wraparound.
- Next and previous cyclic navigation.
- Editor selection and focus are not changed by navigation.
- Active-result preservation after edits.
- Passive and active decorations.
- Clear behavior.

### Component and browser tests

- Empty query shows the search icon, not `0/0`.
- Non-empty query displays `current/total` or `0/0`.
- Navigation buttons reflect result availability.
- `Enter` and `Shift+Enter` navigate while input focus remains stable.
- Clear restores the empty state.
- `Cmd+F` / `Ctrl+F` prevents browser find and selects the input value.
- Options popover behavior remains intact.
- Navigating to hidden content expands its scene and scrolls the active match into view.
- Passive and active highlights use only their intended background treatments.

## Expected File Areas

- `packages/editor/src/editor/tiptap/extensions/` — search extension, plugin state, matcher, decorations, and unit tests.
- `packages/editor/src/editor/useEditorExtensions.ts` — extension registration.
- `packages/editor/src/editor/components/EditorToolbar.tsx` — extension-state binding, commands, shortcut, and input ref.
- `packages/editor/src/editor/components/EditorToolbar.test.tsx` — toolbar integration tests.
- `packages/ui/src/atoms/SearchInput.tsx` — ref and keyboard plumbing if required.
- `packages/ui/src/molecules/SearchControl.tsx` — controlled status/navigation behavior and accessibility.
- Corresponding CSS and browser tests in the editor and UI packages.

## Acceptance Criteria

- Searching is instant and case-insensitive by default.
- Matches stay within individual text blocks but can span inline marks.
- Empty query shows the search icon; non-empty queries show a result position.
- All matches are highlighted, with a stronger background for the active result and no highlight border.
- Buttons, `Enter`, and `Shift+Enter` navigate cyclically without moving editor focus or selection.
- `Cmd+F` / `Ctrl+F` focuses and selects the editor search input instead of opening browser find.
- Navigating to a result inside a collapsed scene expands that scene and scrolls the result into view.
- The architecture accepts future case-sensitive and block-type criteria without replacing the extension or matcher.
- The search-options popover remains an empty wrapper in this release.
