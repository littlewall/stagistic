import type {ScriptBlockIndexSnapshot} from '@stagistic/script';

/** Resolve a visible board position to a heading that follows the insertion. */
export const resolveBoardInsertionTarget = (
    index: ScriptBlockIndexSnapshot,
    actBlockId: string | null,
    beforeSceneId: string | null,
): {beforeBlockId: string | null} | null => {
    const {blocks} = index;
    const actIndex = actBlockId === null ? -1 : blocks.findIndex(block => block.blockType === 'act' && block.blockId === actBlockId);

    if (actBlockId !== null && actIndex < 0) {
        return null;
    }

    const nextActIndex = blocks.findIndex((block, position) => position > actIndex && block.blockType === 'act');
    const end = nextActIndex < 0 ? blocks.length : nextActIndex;

    if (beforeSceneId !== null) {
        const scene = blocks.slice(actIndex + 1, end).find(block => block.blockType === 'scene' && block.blockId === beforeSceneId);

        return scene ? {beforeBlockId: scene.blockId} : null;
    }

    return {beforeBlockId: blocks[end]?.blockId ?? null};
};
