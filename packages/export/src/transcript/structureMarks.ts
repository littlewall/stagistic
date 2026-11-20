import {getScriptBlockNodeType, type ScriptDocument} from '@stagistic/script';

import {DEFAULT_BLOCK_TYPE, type PageStructureMark} from './model';

export const buildStructureMarks = (doc: ScriptDocument): PageStructureMark[] => {
    let actIndex = 0;
    let sceneNumber = 0;

    return doc.content.map((node, index) => {
        const blockType = getScriptBlockNodeType(node, DEFAULT_BLOCK_TYPE);

        if (blockType === 'act') {
            actIndex += 1;

            // An act heading belongs to its upcoming scene, never the preceding act's scene.
            const nextHeading = doc.content.slice(index + 1).find(item => ['act', 'scene'].includes(getScriptBlockNodeType(item)));

            return {actIndex, sceneNumber: nextHeading && getScriptBlockNodeType(nextHeading) === 'scene' ? sceneNumber + 1 : 0};
        }

        if (blockType === 'scene') {
            sceneNumber += 1;
        }

        return {
            actIndex: actIndex > 0 ? actIndex : null,
            sceneNumber,
        };
    });
};
