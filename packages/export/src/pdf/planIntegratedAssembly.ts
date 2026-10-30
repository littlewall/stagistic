export interface IntegratedAssemblyScore {
    musicId: string,
    startBlockId: string,
    afterBlockId: string,
    pageCount: number,
}

export interface IntegratedAssemblyStep {
    kind: 'blank' | 'script' | 'score',
    /** Generated script page index, for 'script' steps. */
    scriptPageIndex?: number,
    /** Owning music, for 'score' steps. */
    musicId?: string,
    /** 0-based page offset inside the score PDF, for 'score' steps. */
    scorePageIndex?: number,
}

export interface IntegratedAssemblyPlan {
    steps: IntegratedAssemblyStep[],
    /** 1-based integrated page number of each music's first score page. */
    scoreStartPageByMusicId: Map<string, number>,
}

/**
 * Plans the Integrated score page order without touching pdf-lib, so the
 * Contents page and the PDF writer derive their numbers from one place.
 *
 * Front matter is deliberately absent: composeLeadingPages keeps the leading
 * page count odd, so with the title page it is always even, leaving both the
 * odd/even parity and the integrated numbering unaffected by it.
 */
export const planIntegratedAssembly = ({
    scriptPageSourceBlockIds,
    scores,
    oddPageBlockIds = [],
}: {
    scriptPageSourceBlockIds: string[][],
    scores: IntegratedAssemblyScore[],
    oddPageBlockIds?: string[],
}): IntegratedAssemblyPlan => {
    const firstPageIndexOf = (blockId: string) => scriptPageSourceBlockIds
        .findIndex(sourceIds => sourceIds.includes(blockId));
    const lastPageIndexOf = (blockId: string) => scriptPageSourceBlockIds
        .reduce((last, sourceIds, index) => sourceIds.includes(blockId) ? index : last, -1);

    const nextContentPage = (index: number) => scriptPageSourceBlockIds.findIndex((ids, i) => i > index && ids.length > 0);
    const oddBlocks = new Set(oddPageBlockIds);
    const musicStartPageIndexes = new Set<number>();
    const afterPageIndexes = new Set<number>();
    const scoresAfterPage = new Map<number, IntegratedAssemblyScore[]>();

    scores.forEach(score => {
        const startPageIndex = firstPageIndexOf(score.startBlockId);

        if (startPageIndex >= 0) {
            musicStartPageIndexes.add(nextContentPage(startPageIndex));
        }

        const afterPageIndex = lastPageIndexOf(score.afterBlockId);

        if (afterPageIndex < 0) {
            return;
        }

        afterPageIndexes.add(afterPageIndex);

        if (score.pageCount <= 0) {
            return;
        }

        const existing = scoresAfterPage.get(afterPageIndex) ?? [];

        existing.push(score);
        scoresAfterPage.set(afterPageIndex, existing);
    });

    const steps: IntegratedAssemblyStep[] = [];
    const scoreStartPageByMusicId = new Map<string, number>();
    const ensureOddPage = () => {
        if (steps.length % 2 === 1) steps.push({kind: 'blank'});
    };
    let requireOddBookPage = false;

    for (let pageIndex = 0; pageIndex < scriptPageSourceBlockIds.length; pageIndex += 1) {
        const sourceIds = scriptPageSourceBlockIds[pageIndex];

        // Pagination blanks were based on script-only parity. Recompute them after scores.
        if (sourceIds.length === 0) continue;

        if (musicStartPageIndexes.has(pageIndex) || requireOddBookPage || sourceIds.some(id => oddBlocks.has(id))) ensureOddPage();

        requireOddBookPage = false;
        steps.push({kind: 'script', scriptPageIndex: pageIndex});

        if (afterPageIndexes.has(pageIndex)) requireOddBookPage = true;

        (scoresAfterPage.get(pageIndex) ?? []).forEach(score => {
            ensureOddPage();
            scoreStartPageByMusicId.set(score.musicId, steps.length + 1);

            for (let offset = 0; offset < score.pageCount; offset += 1) {
                steps.push({
                    kind: 'score',
                    musicId: score.musicId,
                    scorePageIndex: offset,
                });
            }
        });
    }

    return {steps, scoreStartPageByMusicId};
};
