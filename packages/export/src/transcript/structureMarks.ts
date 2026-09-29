import {getScriptBlockNodeType, type ScriptDocument} from '@stagistic/script';

import {DEFAULT_BLOCK_TYPE, type PageStructureMark} from './model';

export const buildStructureMarks = (doc: ScriptDocument): PageStructureMark[] => {
    let actIndex = 0;
    let sceneNumber = 0;

    return doc.content.map(node => {
        const blockType = getScriptBlockNodeType(node, DEFAULT_BLOCK_TYPE);

        if (blockType === 'act') {
            actIndex += 1;
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
