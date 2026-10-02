import {DEFAULT_EDITOR_SETTINGS} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {buildContentsPages} from '../initialPages/contents/buildContentsPages';
import {type ContentsVariant, INTEGRATED_SCORE_DEFAULTS} from '../model/config';
import {block} from '../test/testUtils';
import {deriveIntegratedScoreExportPlan} from './deriveIntegratedScoreExportPlan';

const script = {
    doc: {
        type: 'doc' as const,
        content: [
            block('scene', 'scene', 'Scene'),
            {
                ...block('stageDirection', 'cue', ''),
                content: [
                    {
                        type: 'musicStart',
                        attrs: {
                            musicId: 'music-1',
                            mode: 'open',
                            title: 'Opening',
                        },
                    },
                ],
            },
            block('lyrics', 'music', 'Song'),
            {
                ...block('stageDirection', 'out', ''),
                content: [{type: 'musicOut'}],
            },
            block('stageDirection', 'after', 'After'),
        ],
    },
    characters: [],
    groups: [],
    initialCharacters: [],
    initialPlaces: [],
    initialVocalRanges: [],
    scriptTitle: 'Test',
    titlePage: null,
};

describe('deriveIntegratedScoreExportPlan', () => {
    it('creates an open-music score unit and starts its music and following book on odd pages', () => {
        const plan = deriveIntegratedScoreExportPlan(INTEGRATED_SCORE_DEFAULTS, script);

        expect(plan.postSteps).toEqual([
            {
                kind: 'integrated-score',
                musicId: 'music-1',
                title: 'Opening',
                startBlockId: 'cue',
                afterBlockId: 'out',
            },
        ]);
        expect(plan.pagination.forcedBreaks).toContainEqual({blockId: 'music', kind: 'odd-page'});
        expect(plan.pagination.forcedBreaks).toContainEqual({blockId: 'after', kind: 'odd-page'});
    });

    it.each<{variant: ContentsVariant, showScore: boolean}>([
        {variant: 'scenes', showScore: false},
        {variant: 'musical-numbers', showScore: true},
        {variant: 'scenes-and-musical-numbers', showScore: true},
    ])('renders the appropriate page-number columns for $variant contents', ({variant, showScore}) => {
        const plan = deriveIntegratedScoreExportPlan({
            ...INTEGRATED_SCORE_DEFAULTS,
            initialPages: {
                ...INTEGRATED_SCORE_DEFAULTS.initialPages,
                contents: {enabled: true, variant},
            },
        }, {
            ...script,
            doc: {
                ...script.doc,
                content: [
                    {
                        ...block('stageDirection', 'overture', ''),
                        content: [
                            {
                                type: 'musicStart',
                                attrs: {
                                    musicId: 'music-0',
                                    mode: 'open',
                                    title: 'Overture',
                                },
                            },
                        ],
                    },
                    {...block('stageDirection', 'overture-out', ''), content: [{type: 'musicOut'}]},
                    ...script.doc.content,
                ],
            },
        });
        const contents = plan.leadingPages.initialPages
            .find(page => page.kind === 'contents');

        expect(contents).toBeDefined();

        const pages = buildContentsPages(contents!, DEFAULT_EDITOR_SETTINGS, {
            scriptPageNumberByBlockId: new Map([
                ['overture', 1],
                ['scene', 3],
                ['cue', 5],
            ]),
            scoreStartPageByMusicId: new Map([['music-0', 2], ['music-1', 7]]),
        });
        const runs = pages.flatMap(page => page.flatMap(line => line.runs));
        const headers = runs.filter(run => run.underline).map(run => run.text);

        expect(headers).toEqual(showScore ? ['script', 'score'] : ['script']);
        expect(runs.some(run => run.text.includes('Overture'))).toBe(showScore);
        expect(runs.some(run => run.text.includes('Opening'))).toBe(showScore);

        if (showScore) {
            expect(runs.some(run => run.text === '7')).toBe(true);

            return;
        }

        const scenePage = runs.find(run => run.text === '3');
        const contentRight = DEFAULT_EDITOR_SETTINGS.page.widthPx
            - DEFAULT_EDITOR_SETTINGS.page.marginRightPx;

        expect(scenePage).toBeDefined();
        expect(scenePage!.x).toBeCloseTo(contentRight - DEFAULT_EDITOR_SETTINGS.typography.fontSizePx * 0.6);
        expect(runs.some(run => run.text === '7')).toBe(false);
    });
});
