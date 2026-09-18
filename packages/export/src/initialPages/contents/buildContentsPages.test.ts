import {DEFAULT_EDITOR_SETTINGS} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {ContentsInitialPagePlan} from '../../plan';
import type {VisualLine} from '../../visualLine';
import {buildContentsPages} from './buildContentsPages';

const SETTINGS = DEFAULT_EDITOR_SETTINGS;
const BODY = SETTINGS.typography.fontSizePx;
const CHAR = BODY * 0.6;
const CONTENT_RIGHT = SETTINGS.page.widthPx - SETTINGS.page.marginRightPx;
const CONTENT_LEFT = SETTINGS.page.marginLeftPx;

const textOf = (line: VisualLine) => line.runs.map(run => run.text).join('');
const findLine = (page: VisualLine[], value: string) => {
    const line = page.find(item => item.runs.some(run => run.text === value) || textOf(item) === value);

    expect(line).toBeDefined();

    return line!;
};
const runWithText = (page: VisualLine[], value: string) => {
    const run = page.flatMap(line => line.runs).find(item => item.text === value);

    expect(run).toBeDefined();

    return run!;
};

const scenesPlan = (
    patch: Partial<ContentsInitialPagePlan> = {},
): ContentsInitialPagePlan => ({
    kind: 'contents',
    variant: 'scenes',
    showScoreColumn: false,
    acts: [
        {
            name: 'ACT ONE',
            preSceneMusic: [],
            scenes: [
                {
                    sceneNumber: 1, title: 'Kylie\'s Bedroom', startBlockId: 's1', music: [],
                }, {
                    sceneNumber: 2, title: 'The Diner', startBlockId: 's2', music: [],
                },
            ],
        },
    ],
    ...patch,
});

const pageNumbers = (scriptPages: Record<string, number>) => ({
    scriptPageNumberByBlockId: new Map(Object.entries(scriptPages)),
    scoreStartPageByMusicId: new Map<string, number>(),
});

describe('buildContentsPages scenes variant', () => {
    it('centers the variant heading in bold at heading scale', () => {
        const [page] = buildContentsPages(scenesPlan(), SETTINGS);
        const heading = findLine(page, 'SCENES');

        expect(heading.runs[0]).toMatchObject({
            bold: true,
            fontSizePx: BODY * 1.1,
            x: (SETTINGS.page.widthPx - 'SCENES'.length * BODY * 1.1 * 0.6) / 2,
        });
    });

    it('centers the act heading at body size in bold', () => {
        const [page] = buildContentsPages(scenesPlan(), SETTINGS);

        expect(findLine(page, 'ACT ONE').runs[0]).toMatchObject({
            bold: true,
            fontSizePx: BODY,
        });
    });

    it('omits the act heading when the act has no name', () => {
        const [page] = buildContentsPages(scenesPlan({
            acts: [{...scenesPlan().acts[0], name: null}],
        }), SETTINGS);

        expect(page.some(line => textOf(line) === 'ACT ONE')).toBe(false);
        expect(page.some(line => textOf(line).includes('The Diner'))).toBe(true);
    });

    it('draws an underlined script column header at small scale, right aligned', () => {
        const [page] = buildContentsPages(scenesPlan(), SETTINGS);
        const header = runWithText(page, 'script');
        const smallChar = BODY * 0.85 * 0.6;

        expect(header).toMatchObject({
            underline: true,
            fontSizePx: BODY * 0.85,
        });
        expect(header.x).toBeCloseTo(CONTENT_RIGHT - 'script'.length * smallChar, 5);
    });

    it('attaches the scene number to the title and right aligns the page number', () => {
        const [page] = buildContentsPages(
            scenesPlan(),
            SETTINGS,
            pageNumbers({s1: 1, s2: 4}),
        );
        const entry = findLine(page, '1. Kylie\'s Bedroom');

        expect(entry.runs[0]).toMatchObject({
            text: '1. Kylie\'s Bedroom', bold: true, x: CONTENT_LEFT,
        });

        const number = page
            .flatMap(line => line.runs)
            .find(run => run.text === '1' && run.x > CONTENT_LEFT);

        expect(number?.x).toBeCloseTo(CONTENT_RIGHT - CHAR, 5);
    });

    it('renders an empty number cell when no page numbers are supplied', () => {
        const withNumbers = buildContentsPages(
            scenesPlan(),
            SETTINGS,
            pageNumbers({s1: 1, s2: 4}),
        );
        const without = buildContentsPages(scenesPlan(), SETTINGS);

        expect(without).toHaveLength(withNumbers.length);
        expect(without[0].some(line => textOf(line).trim() === '4')).toBe(false);
    });

    it('spaces scenes with a slight gap between them', () => {
        const [page] = buildContentsPages(scenesPlan(), SETTINGS);
        const lineHeight = BODY * SETTINGS.typography.lineHeight;
        const first = findLine(page, '1. Kylie\'s Bedroom');
        const second = findLine(page, '2. The Diner');

        expect(second.y - first.y).toBeCloseTo((1 + 0.35) * lineHeight, 5);
    });
});

const musicEntry = (
    patch: Partial<ContentsInitialPagePlan['acts'][number]['scenes'][number]['music'][number]> = {},
) => ({
    musicId: 'm1',
    number: '1)',
    title: 'If Life Were a Musical',
    singers: ['Kylie'],
    isInstrumental: false,
    startBlockId: 'mb1',
    ...patch,
});

const musicPlan = (
    patch: Partial<ContentsInitialPagePlan> = {},
): ContentsInitialPagePlan => ({
    kind: 'contents',
    variant: 'musical-numbers',
    showScoreColumn: true,
    acts: [
        {
            name: 'ACT ONE',
            preSceneMusic: [],
            scenes: [
                {
                    sceneNumber: 1,
                    title: 'Kylie\'s Bedroom',
                    startBlockId: 's1',
                    music: [musicEntry()],
                },
            ],
        },
    ],
    ...patch,
});

describe('buildContentsPages musical numbers variant', () => {
    it('attaches the music number to the title', () => {
        const [page] = buildContentsPages(musicPlan(), SETTINGS);
        const entry = findLine(page, '1) If Life Were a Musical');

        expect(entry.runs[0]).toMatchObject({bold: true, x: CONTENT_LEFT});
    });

    it('renders singers italic at small scale, aligned with the title start', () => {
        const [page] = buildContentsPages(musicPlan(), SETTINGS);
        const singers = runWithText(page, 'Kylie');

        expect(singers).toMatchObject({italic: true, fontSizePx: BODY * 0.85});
        expect(singers.x).toBeCloseTo(CONTENT_LEFT + '1) '.length * CHAR, 5);
    });

    it('joins multiple singers with commas', () => {
        const [page] = buildContentsPages(musicPlan({
            acts: [
                {
                    ...musicPlan().acts[0],
                    scenes: [
                        {
                            ...musicPlan().acts[0].scenes[0],
                            music: [musicEntry({singers: ['Whit', 'Kylie']})],
                        },
                    ],
                },
            ],
        }), SETTINGS);

        expect(runWithText(page, 'Whit, Kylie')).toBeDefined();
    });

    it('labels instrumentals', () => {
        const [page] = buildContentsPages(musicPlan({
            acts: [
                {
                    ...musicPlan().acts[0],
                    scenes: [
                        {
                            ...musicPlan().acts[0].scenes[0],
                            music: [musicEntry({singers: [], isInstrumental: true})],
                        },
                    ],
                },
            ],
        }), SETTINGS);

        expect(runWithText(page, 'Instrumental')).toBeDefined();
    });

    it('places both page numbers when the score column is shown', () => {
        const [page] = buildContentsPages(musicPlan(), SETTINGS, {
            scriptPageNumberByBlockId: new Map([['mb1', 2]]),
            scoreStartPageByMusicId: new Map([['m1', 5]]),
        });
        const scoreRun = page.flatMap(line => line.runs).find(run => run.text === '5');

        expect(scoreRun?.x).toBeCloseTo(CONTENT_RIGHT - CHAR, 5);
        expect(page.flatMap(line => line.runs).some(run => run.text === '2')).toBe(true);
    });

    it('does not list scene titles', () => {
        const [page] = buildContentsPages(musicPlan(), SETTINGS);

        expect(page.some(line => textOf(line).includes('Kylie\'s Bedroom'))).toBe(false);
    });

    it('lists pre-scene music before the act scenes', () => {
        const [page] = buildContentsPages(musicPlan({
            acts: [
                {
                    name: 'ACT TWO',
                    preSceneMusic: [
                        musicEntry({
                            musicId: 'm0', number: '0)', title: 'Entracte',
                        }),
                    ],
                    scenes: musicPlan().acts[0].scenes,
                },
            ],
        }), SETTINGS);
        const entracte = page.findIndex(line => textOf(line).startsWith('0) Entracte'));
        const song = page.findIndex(line => textOf(line).startsWith('1) If Life'));

        expect(entracte).toBeGreaterThanOrEqual(0);
        expect(entracte).toBeLessThan(song);
    });
});

describe('buildContentsPages combined variant', () => {
    const combined = (): ContentsInitialPagePlan => ({
        ...musicPlan(),
        variant: 'scenes-and-musical-numbers',
    });

    it('nests music under its scene with a deeper indent', () => {
        const [page] = buildContentsPages(combined(), SETTINGS);
        const scene = findLine(page, '1. Kylie\'s Bedroom');
        const music = findLine(page, '1) If Life Were a Musical');
        const singers = runWithText(page, 'Kylie');

        expect(scene.runs[0].x).toBe(CONTENT_LEFT);
        expect(music.runs[0].x).toBeCloseTo(CONTENT_LEFT + 5 * CHAR, 5);
        expect(singers.x).toBeCloseTo(CONTENT_LEFT + 5 * CHAR + '1) '.length * CHAR, 5);
        expect(music.y).toBeGreaterThan(scene.y);
        expect(music.y - scene.y).toBeCloseTo((1 + 0.25) * BODY * SETTINGS.typography.lineHeight, 5);
    });

    it('leaves the score cell empty for a scene', () => {
        const [page] = buildContentsPages(combined(), SETTINGS, {
            scriptPageNumberByBlockId: new Map([['s1', 1], ['mb1', 2]]),
            scoreStartPageByMusicId: new Map([['m1', 5]]),
        });
        const scene = findLine(page, '1. Kylie\'s Bedroom');

        expect(scene.runs).toHaveLength(2);
        expect(scene.runs[1].text).toBe('1');
    });
});

describe('buildContentsPages overflow', () => {
    const manyScenes = (count: number): ContentsInitialPagePlan => ({
        kind: 'contents',
        variant: 'scenes',
        showScoreColumn: false,
        acts: [
            {
                name: 'ACT ONE',
                preSceneMusic: [],
                scenes: Array.from({length: count}, (_value, index) => ({
                    sceneNumber: index + 1,
                    title: `Scene ${index + 1}`,
                    startBlockId: `s${index + 1}`,
                    music: [],
                })),
            },
        ],
    });

    it('repeats the page heading, act heading, and column header on continuation pages', () => {
        const pages = buildContentsPages(manyScenes(200), SETTINGS);

        expect(pages.length).toBeGreaterThan(1);
        pages.forEach(page => {
            expect(textOf(page[0])).toBe('SCENES');
            expect(page.some(line => textOf(line) === 'ACT ONE')).toBe(true);
            expect(page.flatMap(line => line.runs).some(run => run.text === 'script')).toBe(true);
        });
    });

    it('keeps every scene on some page and in order', () => {
        const pages = buildContentsPages(manyScenes(200), SETTINGS);
        const titles = pages
            .flat()
            .map(textOf)
            .filter(value => (/^\d+\. Scene \d+$/u).test(value));

        expect(titles).toHaveLength(200);
        expect(titles[0]).toBe('1. Scene 1');
        expect(titles.at(-1)).toBe('200. Scene 200');
    });

    it('never leaves an entry below the content bottom', () => {
        const pages = buildContentsPages(manyScenes(200), SETTINGS);
        const bottom = SETTINGS.page.heightPx - SETTINGS.page.marginBottomPx;

        pages.flat().forEach(line => {
            expect(line.y).toBeLessThanOrEqual(bottom);
        });
    });

    it('keeps a music title and its singers on the same page', () => {
        const entries = Array.from({length: 80}, (_value, index) => musicEntry({
            musicId: `m${index}`,
            number: `${index + 1})`,
            title: `Song ${index + 1}`,
            startBlockId: `mb${index}`,
        }));
        const pages = buildContentsPages({
            kind: 'contents',
            variant: 'musical-numbers',
            showScoreColumn: false,
            acts: [
                {
                    name: 'ACT ONE',
                    preSceneMusic: entries,
                    scenes: [],
                },
            ],
        }, SETTINGS);

        pages.forEach(page => {
            const titles = page.filter(line => (/^\d+\) Song \d+$/u).test(textOf(line)));
            const singers = page.filter(line => textOf(line) === 'Kylie');

            expect(titles).toHaveLength(singers.length);
        });
    });
});
