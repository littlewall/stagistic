import {buildPageMark, type EditorSettings} from '@stagistic/script';

import type {ContentsPageNumbers} from '../initialPages/contents/contentsPageNumbers';
import type {ExportPlan} from '../model/plan';
import {planIntegratedAssembly} from '../pdf/planIntegratedAssembly';
import type {ScriptPage} from './model';

/** Resolve visible book labels and final integrated numbers before drawing either Contents or pages. */
export const resolveTranscriptPageNumbers = ({
    scriptPages,
    plan,
    settings,
    scorePageCounts,
}: {
    scriptPages: ScriptPage[],
    plan: ExportPlan,
    settings: EditorSettings,
    scorePageCounts?: Record<string, number>,
}) => {
    const scriptPageSourceBlockIds = scriptPages.map(page => [...page.sourceBlockIds]);
    const oddPageBlockIds = plan.pagination.forcedBreaks.filter(item => item.kind === 'odd-page').map(item => item.blockId);
    const assembly = plan.postSteps.length ? planIntegratedAssembly({
        scriptPageSourceBlockIds,
        oddPageBlockIds,
        scores: plan.postSteps.map(step => ({...step, pageCount: scorePageCounts?.[step.musicId] ?? 0})),
    }) : undefined;
    const integratedPageNumbers = assembly ? new Map(assembly.steps.flatMap((step, index) => step.kind === 'script' ? [[step.scriptPageIndex ?? 0, index + 1]] : [])) : undefined;
    const scriptPageNumberByBlockId = new Map<string, number | string>();
    const cells = [...Object.values(settings.headerFooter.header), ...Object.values(settings.headerFooter.footer)];
    const useCompoundLabel = !assembly && !cells.some(cell => cell.text.includes('{{page_number}}')) && cells.some(cell => cell.text.includes('{{page}}'));

    scriptPages.forEach((page, index) => {
        const pageNumber = integratedPageNumbers?.get(index) ?? page.referencePageNumber ?? index + 1;
        const label = useCompoundLabel && page.mark ? buildPageMark({...page.mark, pageNumber: page.referencePageMarkNumber ?? pageNumber}) : pageNumber;

        page.sourceBlockIds.forEach(blockId => {
            if (!scriptPageNumberByBlockId.has(blockId)) scriptPageNumberByBlockId.set(blockId, label);
        });
    });

    const scoreStartPageByMusicId = assembly?.scoreStartPageByMusicId ?? new Map<string, number>();
    const pageNumbers: ContentsPageNumbers = {
        scriptPageNumberByBlockId,
        scoreStartPageByMusicId,
    };

    return {
        scriptPageSourceBlockIds,
        oddPageBlockIds,
        integratedPageNumbers,
        pageNumbers,
    };
};
