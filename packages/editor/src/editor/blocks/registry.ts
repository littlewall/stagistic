import {actBinding} from './act';
import {actionBinding} from './action';
import {characterBinding} from './character';
import {dialogueBinding} from './dialogue';
import {lyricsBinding} from './lyrics';
import {noteBinding} from './note';
import {parentheticalBinding} from './parenthetical';
import {sceneHeadingBinding} from './sceneHeading';
import {sectionBinding} from './section';
import {transitionBinding} from './transition';
import type {FountainBlockBinding} from './types';

/**
 * The canonical list of all block bindings. Order follows ALL_BLOCK_SPECS
 * for stable derivation.
 *
 * To add a new block: create a folder under `blocks/` with binding, CSS,
 * and icon files, then append the binding here. See
 * docs/adding-a-block-type.md.
 */
export const ALL_BLOCK_BINDINGS: readonly FountainBlockBinding[] = [
    sceneHeadingBinding,
    actBinding,
    sectionBinding,
    actionBinding,
    characterBinding,
    parentheticalBinding,
    dialogueBinding,
    lyricsBinding,
    transitionBinding,
    noteBinding,
];

export {
    actBinding,
    actionBinding,
    characterBinding,
    dialogueBinding,
    lyricsBinding,
    noteBinding,
    parentheticalBinding,
    sceneHeadingBinding,
    sectionBinding,
    transitionBinding,
};
