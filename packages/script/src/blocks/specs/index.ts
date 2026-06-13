import {actSpec} from './act';
import {asideSpec} from './aside';
import {characterSpec} from './character';
import {dialogueSpec} from './dialogue';
import {lyricsSpec} from './lyrics';
import {noteSpec} from './note';
import {sceneHeadingSpec} from './sceneHeading';
import {stageDirectionsSpec} from './stageDirections';

/**
 * The canonical list of all block specs. Order follows ALL_BLOCK_SPECS
 * for stable derivation.
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
    stageDirectionsSpec,
    characterSpec,
    asideSpec,
    dialogueSpec,
    lyricsSpec,
    noteSpec,
] as const;

export {
    actSpec,
    asideSpec,
    characterSpec,
    dialogueSpec,
    lyricsSpec,
    noteSpec,
    sceneHeadingSpec,
    stageDirectionsSpec,
};
