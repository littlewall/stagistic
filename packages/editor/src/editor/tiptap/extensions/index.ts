/*
 * Editor extensions.
 *
 * Tiptap extensions plug into the editor. They fall into a few categories:
 *
 *  - Behaviour: handle keyboard input, paste, smart Enter
 *      FountainBehaviorExtension, EmptyEnterChooserExtension
 *
 *  - Decorations: visual overlays on top of the document
 *      StructureMarkerDecorationsExtension, PlaceholderExtension
 *
 *  - Layout: structural pieces that affect document shape and pagination
 *      FountainColumnExtension, FountainColumnGroupExtension,
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
export {FountainBehaviorExtension} from './FountainBehaviorExtension';

// ─── Decorations ─────────────────────────────────────────────────────────────

export {PlaceholderExtension} from './PlaceholderExtension';
export {StructureMarkerDecorationsExtension} from './StructureMarkerDecorationsExtension';

// ─── Layout ──────────────────────────────────────────────────────────────────

export {
    FountainColumnExtension,
    FountainColumnGroupExtension,
} from './FountainColumnExtensions';
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
