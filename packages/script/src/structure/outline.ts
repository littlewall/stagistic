import type {FountainJSONContent} from '../document';
import {
    ELEMENT_ACT,
    ELEMENT_SCENE_HEADING,
} from '../fountain';
import {collectStructureBlocks} from './collectStructureBlocks';
import {getDefaultActName, normalizeActName} from './structureUtils';

export type StructureOutlineSceneItem = {
    kind: 'scene',
    blockId: string,
    title: string,
};

export type StructureOutlineItem = StructureOutlineSceneItem;

export type StructureOutlineActGroup = {
    actId: string,
    actName: string,
    anchorBlockId: string,
    primary: boolean,
    items: StructureOutlineItem[],
};

export type ScriptStructureOutline = {
    acts: StructureOutlineActGroup[],
};

const createActGroup = (
    actId: string,
    actName: string,
    anchorBlockId: string,
    primary: boolean,
): StructureOutlineActGroup => ({
    actId,
    actName,
    anchorBlockId,
    primary,
    items: [],
});

export const buildScriptStructureOutline = (
    content: FountainJSONContent[] | undefined,
): ScriptStructureOutline => {
    const blocks = collectStructureBlocks(content);

    if (blocks.length === 0) {
        return {
            acts: [],
        };
    }

    const firstActBlock = blocks.find(block => block.blockType === ELEMENT_ACT && block.id);
    const fallbackAnchorBlockId = firstActBlock?.id ?? blocks[0].id;
    const fallbackActName = firstActBlock?.text
        ? normalizeActName(firstActBlock.text)
        : getDefaultActName(1);
    const outlineActs: StructureOutlineActGroup[] = [
        createActGroup(
            fallbackAnchorBlockId || 'structure-act-1',
            fallbackActName,
            fallbackAnchorBlockId || 'structure-act-1',
            true,
        ),
    ];
    let currentGroup = outlineActs[0];
    let actCounter = 0;

    blocks.forEach(block => {
        if (!block.id) {
            return;
        }

        if (block.blockType === ELEMENT_ACT) {
            actCounter += 1;

            const actName = normalizeActName(block.text) || getDefaultActName(actCounter);

            if (actCounter === 1 && currentGroup.items.length === 0) {
                currentGroup = {
                    ...currentGroup,
                    actId: block.id,
                    anchorBlockId: block.id,
                    actName,
                };
                outlineActs[0] = currentGroup;

                return;
            }

            currentGroup = createActGroup(block.id, actName, block.id, false);
            outlineActs.push(currentGroup);
        }

        if (block.blockType === ELEMENT_SCENE_HEADING) {
            currentGroup.items.push({
                kind: 'scene',
                blockId: block.id,
                title: block.text || 'Untitled scene',
            });
        }
    });

    return {
        acts: outlineActs,
    };
};
