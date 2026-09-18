import {
    collectMusicAtoms,
    deriveMusicTimeline,
    getScriptBlockId,
    getScriptBlockNodeType,
    type MusicBlockInput,
} from '@stagistic/script';

import type {IntegratedScoreExportConfig} from './config';
import {deriveBasicExportPlan} from './deriveBasicExportPlan';
import type {
    ExportPlan,
    IntegratedScorePostStep,
} from './plan';
import type {ScriptData} from './scriptData';

/**
 * Derives fixed music units for the Integrated score template. Hits are point
 * cues, so only open music receives a detachable score unit.
 */
export const deriveIntegratedScoreExportPlan = (
    config: IntegratedScoreExportConfig,
    script: ScriptData,
): ExportPlan => {
    const plan = deriveBasicExportPlan(config, script);
    const sourceBlocks: MusicBlockInput[] = script.doc.content.map(node => ({
        blockId: getScriptBlockId(node) ?? '',
        blockType: getScriptBlockNodeType(node, 'stageDirection'),
        musicAtoms: collectMusicAtoms(node),
    }));
    const retainedIds = new Set(plan.visibleBlockIds ?? plan.doc.content
        .map(node => getScriptBlockId(node))
        .filter((id): id is string => id !== null));
    const postSteps: IntegratedScorePostStep[] = deriveMusicTimeline(sourceBlocks).music
        .filter(music => music.mode === 'open' && retainedIds.has(music.startBlockId))
        .map(music => ({
            kind: 'integrated-score',
            musicId: music.musicId,
            title: music.title,
            startBlockId: music.startBlockId,
            afterBlockId: music.effectiveEndBlockId,
        }));

    const blockIds = plan.doc.content.map(node => getScriptBlockId(node) ?? '');

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
                    return {...page, showScoreColumn: true};
                }

                return page;
            }),
        },
        postSteps,
    };
};
