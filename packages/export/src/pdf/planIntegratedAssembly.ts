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
}: {
    scriptPageSourceBlockIds: string[][],
    scores: IntegratedAssemblyScore[],
}): IntegratedAssemblyPlan => {
    const firstPageIndexOf = (blockId: string) => scriptPageSourceBlockIds
        .findIndex(sourceIds => sourceIds.includes(blockId));
    const lastPageIndexOf = (blockId: string) => scriptPageSourceBlockIds
        .reduce((last, sourceIds, index) => sourceIds.includes(blockId) ? index : last, -1);

    const musicStartPageIndexes = new Set<number>();
    const afterPageIndexes = new Set<number>();
    const scoresAfterPage = new Map<number, IntegratedAssemblyScore[]>();

    scores.forEach(score => {
        const startPageIndex = firstPageIndexOf(score.startBlockId);

        if (startPageIndex >= 0) {
            musicStartPageIndexes.add(startPageIndex + 1);
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
    let scriptPagesSinceBlank = 0;
    const nextWouldBeEven = () => scriptPagesSinceBlank % 2 === 0 && scriptPagesSinceBlank > 0;
    let requireOddBookPage = false;

    for (let pageIndex = 0; pageIndex < scriptPageSourceBlockIds.length; pageIndex += 1) {
        if (musicStartPageIndexes.has(pageIndex) && nextWouldBeEven()) {
            steps.push({kind: 'blank'});
            scriptPagesSinceBlank = 0;
        }

        if (requireOddBookPage && nextWouldBeEven()) {
            steps.push({kind: 'blank'});
            scriptPagesSinceBlank = 0;
        }

        requireOddBookPage = false;
        steps.push({kind: 'script', scriptPageIndex: pageIndex});
        scriptPagesSinceBlank += 1;

        if (afterPageIndexes.has(pageIndex)) {
            requireOddBookPage = true;
        }

        (scoresAfterPage.get(pageIndex) ?? []).forEach(score => {
            if (nextWouldBeEven()) {
                steps.push({kind: 'blank'});
                scriptPagesSinceBlank = 0;
            }

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
