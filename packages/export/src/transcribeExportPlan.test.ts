import {CHARACTER_TAG_MARK_NAME, DEFAULT_EDITOR_SETTINGS} from '@stagistic/script';
import {describe, expect, it} from 'vite-plus/test';

import {BASIC_DEFAULTS} from './config';
import {deriveBasicExportPlan} from './deriveBasicExportPlan';
import type {ExportPlan} from './plan';
import {block, sampleDoc} from './testUtils';
import {transcribeExportPlan} from './transcribeExportPlan';
import type {PageItem, VisualLine} from './visualLine';

const plan = (blocks: ExportPlan['doc']['content']): ExportPlan => ({
    doc: {
        type: 'doc',
        content: blocks,
    },
    titlePage: null,
    scriptTitle: '',
    leadingPages: {
        initialPages: [],
        manualBlankCount: 0,
        showRomanPageNumbers: true,
        startEachInitialPageOnOddPage: false,
    },
    pagination: {
        forcedBreaks: [],
    },
    postSteps: [],
});

const baseScript = () => ({
    doc: sampleDoc(),
    characters: [],
    groups: [],
    initialCharacters: [],
    initialPlaces: [],
    initialVocalRanges: [],
    scriptTitle: 'Test Play',
    titlePage: null,
});

const isVisualLine = (item: PageItem): item is VisualLine => !('type' in item);
const isPageBreak = (item: PageItem): boolean => 'type' in item && item.type === '__page_break__';
const indexOfText = (items: PageItem[], text: string): number => items.findIndex(item => isVisualLine(item) && item.runs.some(run => run.text === text));
const splitPages = (items: PageItem[]): PageItem[][] => {
    const pages: PageItem[][] = [[]];

    items.forEach(item => {
        if (isPageBreak(item)) {
            pages.push([]);

            return;
        }

        pages.at(-1)?.push(item);
    });

    return pages;
};
const pageText = (items: PageItem[]): string[] => items.filter(isVisualLine).flatMap(item => item.runs.map(run => run.text));

describe('transcribeExportPlan', () => {
    it('creates text PDF lines from script document content', () => {
        const transcript = transcribeExportPlan(
            plan([block('scene', 's1', 'Mizí i poslední'), block('stageDirection', 'sd1', 'Zvědavá jsem, co mě čeká.')]),
            DEFAULT_EDITOR_SETTINGS,
        );

        const text = transcript.items.filter(isVisualLine).flatMap(item => item.runs.map(run => run.text));

        expect(text).toContain('MIZÍ I POSLEDNÍ');
        expect(text).toContain('Zvědavá jsem, co mě čeká.');
    });

    it('ignores comment anchors so commented text prints exactly like uncommented text', () => {
        const plain = block('stageDirection', 'sd1', 'She exits slowly.');
        const commented: ExportPlan['doc']['content'][number] = {
            type: 'stageDirection',
            attrs: {id: 'sd1', blockType: 'stageDirection'},
            content: [
                {type: 'text', text: 'She '},
                {type: 'text', text: 'exits', marks: [{type: 'commentAnchor', attrs: {threadId: 't1'}}]},
                {type: 'text', text: ' slowly.'},
            ],
        };
        const runs = (doc: ExportPlan['doc']['content']) =>
            transcribeExportPlan(plan(doc), DEFAULT_EDITOR_SETTINGS)
                .items.filter(isVisualLine)
                .map(line => line.runs);

        expect(runs([commented])).toEqual(runs([plain]));
    });

    const findLineWithRun = (items: PageItem[], runText: string): VisualLine | undefined =>
        items.filter(isVisualLine).find(line => line.runs.some(run => run.text === runText));

    const settingsWithSceneFormat = (format: 'none' | 'dot' | 'paren') => ({
        ...DEFAULT_EDITOR_SETTINGS,
        blocks: {
            ...DEFAULT_EDITOR_SETTINGS.blocks,
            scene: {
                ...DEFAULT_EDITOR_SETTINGS.blocks.scene,
                sceneNumberFormat: format,
            },
        },
    });

    it('prepends sequential scene numbers to scene headings in the script body', () => {
        const transcript = transcribeExportPlan(plan([block('scene', 's1', 'Scene one'), block('scene', 's2', 'Scene two')]), DEFAULT_EDITOR_SETTINGS);

        const firstScene = findLineWithRun(transcript.items, 'SCENE ONE');
        const secondScene = findLineWithRun(transcript.items, 'SCENE TWO');

        expect(firstScene?.runs[0]?.text).toBe('1. ');
        expect(secondScene?.runs[0]?.text).toBe('2. ');
    });

    it('renders the scene number without underline while the heading stays underlined', () => {
        const transcript = transcribeExportPlan(plan([block('scene', 's1', 'Scene one')]), DEFAULT_EDITOR_SETTINGS);
        const line = findLineWithRun(transcript.items, 'SCENE ONE');
        const numberRun = line?.runs.find(run => run.text === '1. ');
        const headingRun = line?.runs.find(run => run.text === 'SCENE ONE');

        expect(numberRun?.underline).toBe(false);
        expect(headingRun?.underline).toBe(true);
    });

    it('uses the parenthesis scene-number format when configured', () => {
        const transcript = transcribeExportPlan(plan([block('scene', 's1', 'Scene one')]), settingsWithSceneFormat('paren'));

        expect(findLineWithRun(transcript.items, 'SCENE ONE')?.runs[0]?.text).toBe('1) ');
    });

    it('omits the scene number from the body when numbering is disabled', () => {
        const transcript = transcribeExportPlan(plan([block('scene', 's1', 'Scene one')]), settingsWithSceneFormat('none'));
        const line = findLineWithRun(transcript.items, 'SCENE ONE');

        expect(line?.runs[0]?.text).toBe('SCENE ONE');
        expect(line?.runs.some(run => run.text.trim() === '1.')).toBe(false);
    });

    it('transcribes music atoms as their numbered label so they occupy a line', () => {
        const transcript = transcribeExportPlan(
            plan([
                block('scene', 's1', 'Scene one'),
                {
                    type: 'stageDirection',
                    attrs: {id: 'sd1', blockType: 'stageDirection'},
                    content: [
                        {
                            type: 'musicStart',
                            attrs: {
                                musicId: 'c1',
                                mode: 'open',
                                title: 'dddddddddd',
                            },
                        },
                    ],
                },
            ]),
            DEFAULT_EDITOR_SETTINGS,
        );

        const text = transcript.items.filter(isVisualLine).flatMap(item => item.runs.map(run => run.text));

        expect(text).toContain('1) dddddddddd');
    });

    it('uppercases character tags inside stage directions', () => {
        const transcript = transcribeExportPlan(
            plan([
                {
                    type: 'stageDirection',
                    attrs: {id: 'sd1', blockType: 'stageDirection'},
                    content: [
                        {
                            type: 'text',
                            text: 'Anna',
                            marks: [{type: CHARACTER_TAG_MARK_NAME}],
                        },
                        {type: 'text', text: ' enters.'},
                    ],
                },
            ]),
            DEFAULT_EDITOR_SETTINGS,
        );

        const text = transcript.items.filter(isVisualLine).flatMap(item => item.runs.map(run => run.text));

        expect(text).toContain('ANNA');
        expect(text).toContain(' enters.');
    });

    it('renders music labels inside stage directions in bold', () => {
        const transcript = transcribeExportPlan(
            plan([
                block('scene', 's1', 'Scene one'),
                {
                    type: 'stageDirection',
                    attrs: {id: 'sd1', blockType: 'stageDirection'},
                    content: [
                        {type: 'text', text: 'Lights shift'},
                        {
                            type: 'musicStart',
                            attrs: {
                                musicId: 'c1',
                                mode: 'open',
                                title: 'Knock',
                            },
                        },
                    ],
                },
            ]),
            DEFAULT_EDITOR_SETTINGS,
        );

        const musicRun = transcript.items
            .filter(isVisualLine)
            .flatMap(item => item.runs)
            .find(run => run.text.includes('1) Knock'));

        expect(musicRun?.bold).toBe(true);
    });

    it('does not print an explicit or orphan music out label', () => {
        const transcript = transcribeExportPlan(
            plan([
                {
                    type: 'stageDirection',
                    attrs: {id: 'sd1', blockType: 'stageDirection'},
                    content: [{type: 'musicOut'}],
                },
            ]),
            DEFAULT_EDITOR_SETTINGS,
        );
        const text = transcript.items
            .filter(isVisualLine)
            .flatMap(item => item.runs.map(run => run.text))
            .join('');

        expect(text).not.toContain('out');
    });

    it('keeps multi-character cue lines tight (no spaces around slashes), matching the editor', () => {
        const transcript = transcribeExportPlan(
            plan([block('scene', 's1', 'Scene one'), block('character', 'ch1', 'TOMMY/REBECCA/MICHAEL')]),
            DEFAULT_EDITOR_SETTINGS,
        );

        const text = transcript.items
            .filter(isVisualLine)
            .flatMap(item => item.runs.map(run => run.text))
            .join(' ');

        expect(text).toContain('TOMMY/REBECCA/MICHAEL');
    });

    it('honors forced page breaks', () => {
        const transcript = transcribeExportPlan(
            {
                ...plan([block('scene', 's1', 'Scene one'), block('scene', 's2', 'Scene two')]),
                pagination: {
                    forcedBreaks: [{blockId: 's2', kind: 'new-page'}],
                },
            },
            DEFAULT_EDITOR_SETTINGS,
        );

        expect(transcript.items.some(item => 'type' in item && item.type === '__page_break__')).toBe(true);
    });

    it('renders configured script headers and footers', () => {
        const transcript = transcribeExportPlan(plan([block('scene', 's1', 'Scene one')]), DEFAULT_EDITOR_SETTINGS);
        const text = pageText(transcript.items);

        expect(text).toContain('1-1');
        expect(text).toContain('1.');
    });

    it('carries the configured page-number footer style for integrated-score composition', () => {
        const transcript = transcribeExportPlan(
            {
                ...plan([block('scene', 's1', 'Scene one')]),
                postSteps: [
                    {
                        kind: 'integrated-score',
                        musicId: 'music-1',
                        title: 'Song',
                        startBlockId: 's1',
                        afterBlockId: 's1',
                    },
                ],
            },
            DEFAULT_EDITOR_SETTINGS,
        );

        expect(transcript.integratedFooter).toMatchObject({
            alignment: 'center',
            text: '{{page_number}}',
            bold: true,
        });
    });

    it('emits a blank PDF page for odd-page forced breaks', () => {
        const transcript = transcribeExportPlan(
            {
                ...plan([block('scene', 's1', 'Scene one'), block('scene', 's2', 'Scene two')]),
                pagination: {
                    forcedBreaks: [{blockId: 's2', kind: 'odd-page'}],
                },
            },
            DEFAULT_EDITOR_SETTINGS,
        );

        const firstScene = indexOfText(transcript.items, 'SCENE ONE');
        const secondScene = indexOfText(transcript.items, 'SCENE TWO');
        const breaksBetweenScenes = transcript.items.slice(firstScene, secondScene).filter(isPageBreak);

        expect(breaksBetweenScenes).toHaveLength(2);
    });

    it('gives inserted odd blank pages only the integrated page number', () => {
        const transcript = transcribeExportPlan(
            {
                ...plan([block('scene', 's1', 'Scene one'), block('scene', 's2', 'Scene two')]),
                pagination: {
                    forcedBreaks: [{blockId: 's2', kind: 'odd-page'}],
                },
            },
            DEFAULT_EDITOR_SETTINGS,
        );
        const pages = splitPages(transcript.items);
        const secondScenePageIndex = pages.findIndex(page => pageText(page).includes('SCENE TWO'));
        const insertedBlankText = pageText(pages[secondScenePageIndex - 1] ?? []);
        const secondSceneText = pageText(pages[secondScenePageIndex] ?? []);

        expect(insertedBlankText).toEqual(['2.']);
        expect(secondSceneText).toContain('2-2');
        expect(secondSceneText).toContain('3.');
    });

    it('prepends the title page as page one, before the script content', () => {
        const transcript = transcribeExportPlan({...plan([block('scene', 's1', 'Scene one')]), scriptTitle: 'My Play'}, DEFAULT_EDITOR_SETTINGS);

        const titleIndex = indexOfText(transcript.items, 'My Play');
        const firstBreak = transcript.items.findIndex(isPageBreak);
        const sceneIndex = indexOfText(transcript.items, 'SCENE ONE');

        expect(titleIndex).toBe(0);
        expect(firstBreak).toBeGreaterThan(titleIndex);
        expect(sceneIndex).toBeGreaterThan(firstBreak);
    });

    it('places a configured logo before the title on page one', () => {
        const transcript = transcribeExportPlan(
            {
                ...plan([block('scene', 's1', 'Scene one')]),
                scriptTitle: 'My Play',
                titlePage: {
                    logo: {
                        dataUrl: 'data:image/png;base64,aGVsbG8=',
                        filename: 'logo.png',
                        mimeType: 'image/png',
                        widthPx: 400,
                        heightPx: 200,
                        sizeBytes: 5,
                    },
                },
            },
            DEFAULT_EDITOR_SETTINGS,
        );

        expect(transcript.items[0]).toMatchObject({type: 'title-page-image'});
        expect(indexOfText(transcript.items, 'My Play')).toBe(1);
    });

    it('adds an unnumbered balancing blank when no leading pages are configured', () => {
        const transcript = transcribeExportPlan(plan([block('scene', 's1', 'Scene one')]), DEFAULT_EDITOR_SETTINGS);
        const pages = splitPages(transcript.items);

        expect(pages).toHaveLength(3);
        expect(pageText(pages[1] ?? [])).toEqual([]);
        expect(pageText(pages[2] ?? [])).toContain('SCENE ONE');
        expect(pageText(pages[2] ?? [])).toContain('1.');
    });

    it('numbers initial, manual blank, and balancing pages with lowercase Roman numerals', () => {
        const base = plan([block('scene', 's1', 'Scene one')]);
        const transcript = transcribeExportPlan(
            {
                ...base,
                leadingPages: {
                    initialPages: [
                        {
                            kind: 'characters-and-places',
                            characters: [
                                {
                                    id: 'anna',
                                    displayName: 'Anna',
                                    outline: null,
                                },
                            ],
                            places: [],
                            showCharacterOutlines: false,
                        },
                    ],
                    manualBlankCount: 1,
                    showRomanPageNumbers: true,
                    startEachInitialPageOnOddPage: false,
                },
            },
            DEFAULT_EDITOR_SETTINGS,
        );
        const pages = splitPages(transcript.items);

        expect(pages).toHaveLength(5);
        expect(pageText(pages[1] ?? [])).toContain('i');
        expect(pageText(pages[2] ?? [])).toEqual(['ii']);
        expect(pageText(pages[3] ?? [])).toEqual(['iii']);
        expect(pageText(pages[4] ?? [])).toContain('SCENE ONE');
        expect(pageText(pages[4] ?? [])).toContain('1.');
    });

    it('inserts manual and balancing blanks after initial pages', () => {
        const base = plan([block('scene', 's1', 'Scene one')]);
        const transcript = transcribeExportPlan(
            {
                ...base,
                scriptTitle: 'My Play',
                leadingPages: {
                    ...base.leadingPages,
                    manualBlankCount: 2,
                },
            },
            DEFAULT_EDITOR_SETTINGS,
        );

        const sceneIndex = indexOfText(transcript.items, 'SCENE ONE');
        const breaksBeforeScene = transcript.items.slice(0, sceneIndex).filter(isPageBreak).length;

        // title → manual1 → manual2 → balancing blank → script.
        expect(breaksBeforeScene).toBe(4);
    });

    it('pushes a non-splittable heading whole to the next page instead of tearing it', () => {
        const fillers = Array.from({length: 40}, (_unused, index) => block('stageDirection', `sd${index}`, `Line number ${index} on the page.`));
        const transcript = transcribeExportPlan(
            plan([
                block('scene', 's1', 'Scene one'),
                ...fillers,
                block('character', 'lastHeading', 'ISABELLA'),
                block('dialogue', 'd1', 'A closing line of dialogue.'),
            ]),
            DEFAULT_EDITOR_SETTINGS,
        );

        const breakIndex = transcript.items.findIndex(item => 'type' in item && item.type === '__page_break__');
        const headingIndex = transcript.items.findIndex(item => !('type' in item) && item.runs.some(run => run.text === 'ISABELLA'));

        // The heading lands AFTER the page break (kept with its dialogue), not before.
        expect(breakIndex).toBeGreaterThan(-1);
        expect(headingIndex).toBeGreaterThan(breakIndex);
    });

    it('prints script page numbers on the contents page', () => {
        const planWithContents = deriveBasicExportPlan(BASIC_DEFAULTS, {
            ...baseScript(),
            doc: {
                type: 'doc',
                content: [
                    block('scene', 's1', 'First Scene'),
                    block('dialogue', 'd1', 'Hello.'),
                    block('scene', 's2', 'Second Scene'),
                    block('dialogue', 'd2', 'Goodbye.'),
                ],
            },
        });
        const transcript = transcribeExportPlan(planWithContents, DEFAULT_EDITOR_SETTINGS);
        const lines = transcript.items.filter((item): item is VisualLine => !('type' in item));
        const firstScene = lines.find(line => line.runs[0]?.text === '1. First Scene');
        const secondScene = lines.find(line => line.runs[0]?.text === '2. Second Scene');

        expect(firstScene?.runs.at(-1)?.text).toBe('1');
        expect(secondScene?.runs.at(-1)?.text).toBe('2');
    });

    it('keeps the leading page count even so integrated numbering is stable', () => {
        const planWithContents = deriveBasicExportPlan(BASIC_DEFAULTS, baseScript());
        const transcript = transcribeExportPlan(planWithContents, DEFAULT_EDITOR_SETTINGS);

        expect((transcript.leadingPageCount ?? 0) % 2).toBe(0);
    });
});
