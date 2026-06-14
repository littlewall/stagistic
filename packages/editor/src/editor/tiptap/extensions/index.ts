/*
 * Editor extensions.
 *
 * Tiptap extensions plug into the editor. They fall into a few categories:
 *
 *  - Behaviour: handle keyboard input, paste, smart Enter
 *      ScriptBehaviorExtension, EmptyEnterChooserExtension
 *
 *  - Decorations: visual overlays on top of the document
 *      PlaceholderExtension
 *
 *  - Layout: structural pieces that affect document shape and pagination
 *      ScriptColumnExtension, ScriptColumnGroupExtension,
 *      createPaginationExtension
 *
 *  - Runtime: build derived indexes that other parts of the app read
 *      (character index, structure index)
 *      EditorRuntimeExtension, BlockUiEventsExtension,
 *      CharacterRefSyncExtension
 *
 * To add a new extension, drop a `*Extension.ts` file in this folder and
 * re-export it from the matching section below.
 */

// ─── Behaviour ───────────────────────────────────────────────────────────────

export {
    EMPTY_ENTER_CHOOSER_WRITER_TYPES,
    EmptyEnterChooserExtension,
    getEmptyEnterChooserFromState,
    isEmptyEnterChooserWriterType,
} from './EmptyEnterChooserExtension';
export {ScriptBehaviorExtension} from './ScriptBehaviorExtension';

// ─── Decorations ─────────────────────────────────────────────────────────────

export {PlaceholderExtension} from './PlaceholderExtension';

// ─── Layout ──────────────────────────────────────────────────────────────────

export {
    ScriptColumnExtension,
    ScriptColumnGroupExtension,
} from './ScriptColumnExtensions';
export {createPaginationExtension, PaginationExtension} from './PaginationExtension';

// ─── Runtime indexes ─────────────────────────────────────────────────────────

export {
    BlockUiEventsExtension,
    getBlockUiEventsFromState,
} from './BlockUiEventsExtension';
export {CharacterRefSyncExtension} from './CharacterRefSyncExtension';
export {
    EditorRuntimeExtension,
    getEditorRuntimeFromState,
} from './EditorRuntimeExtension';
