import type {ScriptDocument} from '../document';
import {collectStructureBlocks} from './collectStructureBlocks';

export interface ScriptSummaryMetadata {
    pageCount: number | null,
    sceneCount: number,
    actSceneCounts: number[],
    unassignedSceneCount: number,
}

export const buildScriptSummaryMetadata = (
    document: ScriptDocument,
    pageCount: number | null = null,
): ScriptSummaryMetadata => {
    const metadata: ScriptSummaryMetadata = {
        pageCount,
        sceneCount: 0,
        actSceneCounts: [],
        unassignedSceneCount: 0,
    };

    for (const block of collectStructureBlocks(document.content)) {
        if (block.blockType === 'act') {
            metadata.actSceneCounts.push(0);
            continue;
        }

        if (block.blockType !== 'scene') {
            continue;
        }

        metadata.sceneCount += 1;

        const actIndex = metadata.actSceneCounts.length - 1;

        if (actIndex < 0) {
            metadata.unassignedSceneCount += 1;
            continue;
        }

        metadata.actSceneCounts[actIndex] += 1;
    }

    return metadata;
};
