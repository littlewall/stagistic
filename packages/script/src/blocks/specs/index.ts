import {actSpec} from './act';
import {actionSpec} from './action';
import {characterSpec} from './character';
import {dialogueSpec} from './dialogue';
import {lyricsSpec} from './lyrics';
import {noteSpec} from './note';
import {parentheticalSpec} from './parenthetical';
import {sceneHeadingSpec} from './sceneHeading';
import {sectionSpec} from './section';
import {transitionSpec} from './transition';

/**
 * The canonical list of all block specs. Order matters where it affects
 * UI lists (FOUNTAIN_BLOCK_ITEMS, toolbar menus); keep it stable.
 *
 * `as const` preserves literal types so that ScriptBlockNodeType and
 * ScriptBlockType (defined in fountain/blockTypeMapping.ts) can be
 * derived from this array via indexed access.
 *
 * To add a new block: create a spec file in this folder, import it here,
 * and append it to this array. See docs/adding-a-block-type.md.
 */
export const ALL_BLOCK_SPECS = [
    sceneHeadingSpec,
    actSpec,
    sectionSpec,
    actionSpec,
    characterSpec,
    parentheticalSpec,
    dialogueSpec,
    lyricsSpec,
    transitionSpec,
    noteSpec,
] as const;

export {
    actionSpec,
    actSpec,
    characterSpec,
    dialogueSpec,
    lyricsSpec,
    noteSpec,
    parentheticalSpec,
    sceneHeadingSpec,
    sectionSpec,
    transitionSpec,
};
