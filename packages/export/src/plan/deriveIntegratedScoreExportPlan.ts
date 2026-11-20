import {
    collectMusicAtoms,
    deriveMusicTimeline,
    getScriptBlockId,
    getScriptBlockNodeType,
    type MusicBlockInput,
} from '@stagistic/script';

import type {IntegratedScoreExportConfig} from '../model/config';
import type {
    ExportPlan,
    IntegratedScorePostStep,
} from '../model/plan';
import type {ScriptData} from '../model/scriptData';
import {deriveScriptExportPlan} from './deriveBasicExportPlan';

/**
 * Derives fixed music units for the Integrated score template. Hits are point
 * cues, so only open music receives a detachable score unit.
 */
export const deriveIntegratedScoreExportPlan = (
    config: IntegratedScoreExportConfig,
    script: ScriptData,
): ExportPlan => {
    const plan = deriveScriptExportPlan(config, script);
    const sourceBlocks: MusicBlockInput[] = script.doc.content.map(node => ({
        blockId: getScriptBlockId(node) ?? '',
        blockType: getScriptBlockNodeType(node, 'stageDirection'),
        musicAtoms: collectMusicAtoms(node),
    }));
    const retainedIds = new Set(plan.visibleBlockIds ?? plan.doc.content
        .map(node => getScriptBlockId(node))
        .filter((id): id is string => id !== null));
    const blockIds = plan.doc.content.map(node => getScriptBlockId(node) ?? '');
    const printableIds = new Set(blockIds);
    const printableEnd = (startId: string, endId: string) => {
        const start = sourceBlocks.findIndex(block => block.blockId === startId);
        const end = sourceBlocks.findIndex(block => block.blockId === endId);

        return sourceBlocks.slice(start, Math.max(start, end) + 1).findLast(block => printableIds.has(block.blockId))?.blockId ?? startId;
    };
    const postSteps: IntegratedScorePostStep[] = deriveMusicTimeline(sourceBlocks).music
        .filter(music => music.mode === 'open' && retainedIds.has(music.startBlockId))
        .map(music => ({
            kind: 'integrated-score',
            musicId: music.musicId,
            title: music.title,
            startBlockId: music.startBlockId,
            afterBlockId: printableEnd(music.startBlockId, music.effectiveEndBlockId),
        }));

    postSteps.forEach(step => {
        const startIndex = blockIds.indexOf(step.startBlockId);
        const afterIndex = blockIds.indexOf(step.afterBlockId);

        if (startIndex >= 0 && startIndex + 1 < blockIds.length) {
            plan.pagination.forcedBreaks.push({blockId: blockIds[startIndex + 1], kind: 'odd-page'});
        }

        if (afterIndex >= 0 && afterIndex + 1 < blockIds.length) {
            plan.pagination.forcedBreaks.push({blockId: blockIds[afterIndex + 1], kind: 'odd-page'});
        }
    });

    return {
        ...plan,
        leadingPages: {
            ...plan.leadingPages,
            initialPages: plan.leadingPages.initialPages.map(page => {
                if (page.kind === 'contents') {
                    return {...page, showScoreColumn: page.variant !== 'scenes'};
                }

                return page;
            }),
        },
        postSteps,
    };
};
