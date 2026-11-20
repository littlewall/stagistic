import type {ScriptBlockIndexSnapshot} from '../indexing';
import {getDefaultActName, normalizeActName} from '../structure';
import {createBoardCharacterResolver} from './resolveBoardCharacters';
import type {
    SceneBoardAct,
    SceneBoardCatalog,
    SceneBoardCharacter,
    SceneBoardModel,
    SceneBoardPresence,
    SceneBoardScene,
} from './types';

const UNTITLED_SCENE = 'Untitled scene';

/** Only cues and tags in stage directions prove presence. */
const PRESENCE_BY_BLOCK_TYPE: Readonly<Record<string, SceneBoardPresence>> = {
    character: 'present',
    stageDirection: 'present',
};

const createAct = (actBlockId: string | null, name: string): SceneBoardAct => ({
    actBlockId,
    name,
    scenes: [],
});

/*
 * Pure board model: acts and scenes follow `buildScriptStructureOutline` (names, grouping,
 * scene order), numbering follows the structure sidebar, and every scene carries the
 * characters derived from the script, in order of first appearance. The one deliberate
 * difference: scenes before the first act heading form their own default act, so no two
 * sections share a name or an id.
 */
export const buildSceneBoardModel = (
    index: ScriptBlockIndexSnapshot,
    catalog: SceneBoardCatalog,
): SceneBoardModel => {
    const blocks = index.blocks.filter(block => block.blockId);

    if (blocks.length === 0) {
        return {acts: []};
    }

    const resolve = createBoardCharacterResolver(catalog);
    const acts: SceneBoardAct[] = [createAct(null, getDefaultActName(1))];
    const charactersByScene = new Map<string, Map<string, SceneBoardCharacter>>();
    let cueCount = 0;
    let currentAct = acts[0];
    let currentScene: SceneBoardScene | null = null;
    let actCounter = 0;
    let sceneNumber = 0;

    blocks.forEach(block => {
        if (block.blockType === 'act') {
            actCounter += 1;

            const name = normalizeActName(block.textContent) || getDefaultActName(actCounter);

            currentScene = null;

            if (actCounter === 1 && currentAct.scenes.length === 0) {
                currentAct.actBlockId = block.blockId;
                currentAct.name = name;

                return;
            }

            currentAct = createAct(block.blockId, name);
            acts.push(currentAct);

            return;
        }

        if (block.blockType === 'scene') {
            sceneNumber += 1;
            currentScene = {
                headingBlockId: block.blockId,
                number: sceneNumber,
                title: block.textContent || UNTITLED_SCENE,
                actBlockId: currentAct.actBlockId,
                characters: [],
            };
            currentAct.scenes.push(currentScene);
            charactersByScene.set(block.blockId, new Map());
            cueCount = 0;

            return;
        }

        const level = PRESENCE_BY_BLOCK_TYPE[block.blockType];
        const entries = currentScene ? charactersByScene.get(currentScene.headingBlockId) : undefined;

        if (!level || !entries || !block.characterRefs) {
            return;
        }

        const cue = block.blockType === 'character' ? cueCount : null;

        if (cue !== null) cueCount += 1;

        block.characterRefs.flatMap(resolve).forEach(resolved => {
            const existing = entries.get(resolved.entryId);

            if (!existing) {
                entries.set(resolved.entryId, {
                    ...resolved,
                    level,
                    firstCue: cue,
                });
            } else if (existing.firstCue === null) {
                existing.firstCue = cue;
            }
        });
    });

    acts.forEach(act => {
        act.scenes.forEach(scene => {
            scene.characters = [...charactersByScene.get(scene.headingBlockId)?.values() ?? []];
        });
    });

    return {acts};
};
