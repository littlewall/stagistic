import type {BlockSpacingSettings} from '../settings';

export type BlockSpecDefaults = Required<Pick<
    BlockSpacingSettings,
    'spacingBeforeEm' | 'lineHeight' | 'nextElement' | 'textAlign' | 'casing' | 'isBold' | 'isItalic' | 'isUnderline'
>> & Pick<
    BlockSpacingSettings,
    'spacingAfterEm' | 'shortcut' | 'indentLeftChars' | 'indentRightChars' | 'indentLeftPx' | 'indentRightPx' | 'fontSizePx'
>;

/**
 * A BlockSpec is the single source of truth for one block type's
 * data-model facts: how it's identified, what it's called, and what its
 * default settings are.
 *
 * Specs live in `packages/script/src/blocks/specs/<blockName>.ts` and are
 * collected into `ALL_BLOCK_SPECS`. All identifier maps, the items list,
 * the default settings, and the Enter-fallback table are *derived* from
 * this array — no hand-maintained sync.
 *
 * The string-typed `nodeType` / `blockType` fields let each spec assert
 * its identifiers as literal types via `as const satisfies BlockSpec`.
 * The precise `ScriptBlockNodeType` / `ScriptBlockType` unions are derived
 * from the assembled `ALL_BLOCK_SPECS` array, avoiding a definition cycle.
 *
 * Presentation facts (CSS class, icon, CSS var prefix) live in the editor
 * package as a `BlockBinding` that references the spec by import.
 */
export interface BlockSpec {
    /** Tiptap node name (camelCase). */
    readonly nodeType: string,
    /** Stored block type identifier (snake_case). */
    readonly blockType: string,
    /** Human-readable label used in toolbars and menus. */
    readonly label: string,
    /** Stable list id (used for keys in UI lists). */
    readonly listId: string,
    /**
     * Hardcoded default for the block type a user lands on after pressing
     * Enter from this block, when no user setting overrides it.
     */
    readonly enterFallback: string,
    /** Default settings for this block, contributed to DEFAULT_EDITOR_SETTINGS.blocks. */
    readonly defaultSettings: BlockSpecDefaults,
}
