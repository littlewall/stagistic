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

export {CharacterTagInputExtension} from './CharacterTagInputExtension';
export {EmptyEnterChooserExtension} from './EmptyEnterChooserExtension';
export {MusicCommandsExtension} from './music/MusicCommandsExtension';
export {getMusicComposeFromState, MusicInputExtension} from './MusicInputExtension';
export {MusicNumberingExtension} from './MusicNumberingExtension';
export {MusicRailExtension} from './musicRail/MusicRailExtension';
export {SceneCommandsExtension} from './SceneCommandsExtension';
export {ScriptBehaviorExtension} from './ScriptBehaviorExtension';

// ─── Decorations ─────────────────────────────────────────────────────────────

export {BlockFocusFlashExtension} from './BlockFocusFlashExtension';
export {PlaceholderExtension} from './PlaceholderExtension';
export {CommentsExtension, type CommentsExtensionCallbacks} from './comments';
export {getEditorSearchSnapshot, SearchExtension} from './search';
export {SceneGuardExtension} from './SceneGuardExtension';
export {SceneNumberingExtension} from './SceneNumberingExtension';
export {getSceneCollapseSnapshot, SceneCollapseExtension} from './sceneCollapse/SceneCollapseExtension';

// ─── Layout ──────────────────────────────────────────────────────────────────

export {getPaginationPluginState} from './pagination/plugin/createPaginationPlugin';
export {createPaginationExtension} from './PaginationExtension';

// ─── Runtime indexes ─────────────────────────────────────────────────────────

export {BlockUiEventsExtension, getBlockUiEventsFromState} from './BlockUiEventsExtension';
export {CharacterRefSyncExtension} from './CharacterRefSyncExtension';
export {EditorRuntimeExtension, getEditorRuntimeFromState} from './EditorRuntimeExtension';
