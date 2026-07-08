import {
    getScriptBlockId,
} from '@stagistic/script';

import type {BasicExportConfig} from './config';
import {filterScriptByCharacter} from './filterByCharacter';
import type {
    ExportPlan,
    ForcedBreak,
} from './plan';
import {groupScenes} from './scenes';
import type {ScriptData} from './scriptData';

export const deriveBasicExportPlan = (
    config: BasicExportConfig,
    script: ScriptData,
): ExportPlan => {
    const doc = filterScriptByCharacter(script.doc, config.characterFilter, script.characters);
    const forcedBreaks: ForcedBreak[] = [];
    let hasPreviousGroup = false;

    groupScenes(doc).forEach(group => {
        const heading = group.blocks[0];
        const blockId = heading ? getScriptBlockId(heading) : null;

        if (!blockId) {
            return;
        }

        if (group.sceneBlockId === null && group.actBlockId !== null) {
            if (hasPreviousGroup) {
                forcedBreaks.push({blockId, kind: 'new-page'});
            }

            hasPreviousGroup = true;

            return;
        }

        if (group.sceneBlockId !== null && (config.pageBreaks.sceneOnNewPage || config.pageBreaks.sceneOnOddPage)) {
            forcedBreaks.push({
                blockId,
                kind: config.pageBreaks.sceneOnOddPage ? 'odd-page' : 'new-page',
            });

            hasPreviousGroup = true;

            return;
        }

        hasPreviousGroup = true;
    });

    return {
        doc,
        titlePage: script.titlePage,
        scriptTitle: script.scriptTitle,
        pagination: {
            forcedBreaks,
            blankPagesBeforeScript: config.blankPages.betweenTitleAndScript,
        },
        postSteps: [],
    };
};
