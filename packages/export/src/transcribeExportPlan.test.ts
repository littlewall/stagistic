import {
    CHARACTER_TAG_MARK_NAME,
    DEFAULT_EDITOR_SETTINGS,
} from '@stagistic/script';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {ExportPlan} from './plan';
import {block} from './testUtils';
import {transcribeExportPlan} from './transcribeExportPlan';
import type {
    PageItem,
    VisualLine,
} from './visualLine';

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
const pageText = (items: PageItem[]): string[] => items
    .filter(isVisualLine)
    .flatMap(item => item.runs.map(run => run.text));

describe('transcribeExportPlan', () => {
    it('creates text PDF lines from script document content', () => {
        const transcript = transcribeExportPlan(plan([block('scene', 's1', 'Mizí i poslední'), block('stageDirection', 'sd1', 'Zvědavá jsem, co mě čeká.')]), DEFAULT_EDITOR_SETTINGS);

        const text = transcript.items
            .filter(isVisualLine)
            .flatMap(item => item.runs.map(run => run.text));

        expect(text).toContain('MIZÍ I POSLEDNÍ');
        expect(text).toContain('Zvědavá jsem, co mě čeká.');
    });

    it('transcribes music atoms as their numbered label so they occupy a line', () => {
        const transcript = transcribeExportPlan(plan([
            block('scene', 's1', 'Scene one'), {
                type: 'stageDirection',
                attrs: {id: 'sd1', blockType: 'stageDirection'},
                content: [
                    {
                        type: 'musicStart',
                        attrs: {
                            musicId: 'c1', mode: 'open', title: 'dddddddddd',
                        },
                    },
                ],
            },
        ]), DEFAULT_EDITOR_SETTINGS);

        const text = transcript.items
            .filter(isVisualLine)
            .flatMap(item => item.runs.map(run => run.text));

        expect(text).toContain('1) dddddddddd');
    });

    it('uppercases character tags inside stage directions', () => {
        const transcript = transcribeExportPlan(plan([
            {
                type: 'stageDirection',
                attrs: {id: 'sd1', blockType: 'stageDirection'},
                content: [
                    {
                        type: 'text',
                        text: 'Anna',
                        marks: [{type: CHARACTER_TAG_MARK_NAME}],
                    }, {type: 'text', text: ' enters.'},
                ],
            },
        ]), DEFAULT_EDITOR_SETTINGS);

        const text = transcript.items
            .filter(isVisualLine)
            .flatMap(item => item.runs.map(run => run.text));

        expect(text).toContain('ANNA');
        expect(text).toContain(' enters.');
    });

    it('renders music labels inside stage directions in bold', () => {
        const transcript = transcribeExportPlan(plan([
            block('scene', 's1', 'Scene one'), {
                type: 'stageDirection',
                attrs: {id: 'sd1', blockType: 'stageDirection'},
                content: [
                    {type: 'text', text: 'Lights shift'}, {
                        type: 'musicStart',
                        attrs: {
                            musicId: 'c1', mode: 'open', title: 'Knock',
                        },
                    },
                ],
            },
        ]), DEFAULT_EDITOR_SETTINGS);

        const musicRun = transcript.items
            .filter(isVisualLine)
            .flatMap(item => item.runs)
            .find(run => run.text.includes('1) Knock'));

        expect(musicRun?.bold).toBe(true);
    });

    it('does not print an explicit or orphan music out label', () => {
        const transcript = transcribeExportPlan(plan([
            {
                type: 'stageDirection',
                attrs: {id: 'sd1', blockType: 'stageDirection'},
                content: [{type: 'musicOut'}],
            },
        ]), DEFAULT_EDITOR_SETTINGS);
        const text = transcript.items
            .filter(isVisualLine)
            .flatMap(item => item.runs.map(run => run.text))
            .join('');

        expect(text).not.toContain('out');
    });

    it('keeps multi-character cue lines tight (no spaces around slashes), matching the editor', () => {
        const transcript = transcribeExportPlan(plan([block('scene', 's1', 'Scene one'), block('character', 'ch1', 'TOMMY/REBECCA/MICHAEL')]), DEFAULT_EDITOR_SETTINGS);

        const text = transcript.items
            .filter(isVisualLine)
            .flatMap(item => item.runs.map(run => run.text))
            .join(' ');

        expect(text).toContain('TOMMY/REBECCA/MICHAEL');
    });

    it('honors forced page breaks', () => {
        const transcript = transcribeExportPlan({
            ...plan([block('scene', 's1', 'Scene one'), block('scene', 's2', 'Scene two')]),
            pagination: {
                forcedBreaks: [{blockId: 's2', kind: 'new-page'}],
            },
        }, DEFAULT_EDITOR_SETTINGS);

        expect(transcript.items.some(item => 'type' in item && item.type === '__page_break__')).toBe(true);
    });

    it('renders configured script headers and footers', () => {
        const transcript = transcribeExportPlan(plan([block('scene', 's1', 'Scene one')]), DEFAULT_EDITOR_SETTINGS);
        const text = pageText(transcript.items);

        expect(text).toContain('1-1');
        expect(text).toContain('1.');
    });

    it('emits a blank PDF page for odd-page forced breaks', () => {
        const transcript = transcribeExportPlan({
            ...plan([block('scene', 's1', 'Scene one'), block('scene', 's2', 'Scene two')]),
            pagination: {
                forcedBreaks: [{blockId: 's2', kind: 'odd-page'}],
            },
        }, DEFAULT_EDITOR_SETTINGS);

        const firstScene = indexOfText(transcript.items, 'SCENE ONE');
        const secondScene = indexOfText(transcript.items, 'SCENE TWO');
        const breaksBetweenScenes = transcript.items.slice(firstScene, secondScene).filter(isPageBreak);

        expect(breaksBetweenScenes).toHaveLength(2);
    });

    it('gives inserted odd blank pages only the integrated page number', () => {
        const transcript = transcribeExportPlan({
            ...plan([block('scene', 's1', 'Scene one'), block('scene', 's2', 'Scene two')]),
            pagination: {
                forcedBreaks: [{blockId: 's2', kind: 'odd-page'}],
            },
        }, DEFAULT_EDITOR_SETTINGS);
        const pages = splitPages(transcript.items);
        const secondScenePageIndex = pages.findIndex(page => pageText(page).includes('SCENE TWO'));
        const insertedBlankText = pageText(pages[secondScenePageIndex - 1] ?? []);
        const secondSceneText = pageText(pages[secondScenePageIndex] ?? []);

        expect(insertedBlankText).toEqual(['2.']);
        expect(secondSceneText).toContain('2-2');
        expect(secondSceneText).toContain('3.');
    });

    it('prepends the title page as page one, before the script content', () => {
        const transcript = transcribeExportPlan(
            {...plan([block('scene', 's1', 'Scene one')]), scriptTitle: 'My Play'},
            DEFAULT_EDITOR_SETTINGS,
        );

        const titleIndex = indexOfText(transcript.items, 'My Play');
        const firstBreak = transcript.items.findIndex(isPageBreak);
        const sceneIndex = indexOfText(transcript.items, 'SCENE ONE');

        expect(titleIndex).toBe(0);
        expect(firstBreak).toBeGreaterThan(titleIndex);
        expect(sceneIndex).toBeGreaterThan(firstBreak);
    });

    it('adds an unnumbered balancing blank when no leading pages are configured', () => {
        const transcript = transcribeExportPlan(
            plan([block('scene', 's1', 'Scene one')]),
            DEFAULT_EDITOR_SETTINGS,
        );
        const pages = splitPages(transcript.items);

        expect(pages).toHaveLength(3);
        expect(pageText(pages[1] ?? [])).toEqual([]);
        expect(pageText(pages[2] ?? [])).toContain('SCENE ONE');
        expect(pageText(pages[2] ?? [])).toContain('1.');
    });

    it('numbers initial, manual blank, and balancing pages with lowercase Roman numerals', () => {
        const base = plan([block('scene', 's1', 'Scene one')]);
        const transcript = transcribeExportPlan({
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
        }, DEFAULT_EDITOR_SETTINGS);
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
        const transcript = transcribeExportPlan({
            ...base,
            scriptTitle: 'My Play',
            leadingPages: {
                ...base.leadingPages,
                manualBlankCount: 2,
            },
        }, DEFAULT_EDITOR_SETTINGS);

        const sceneIndex = indexOfText(transcript.items, 'SCENE ONE');
        const breaksBeforeScene = transcript.items.slice(0, sceneIndex).filter(isPageBreak).length;

        // title → manual1 → manual2 → balancing blank → script.
        expect(breaksBeforeScene).toBe(4);
    });

    it('pushes a non-splittable heading whole to the next page instead of tearing it', () => {
        const fillers = Array.from({length: 40}, (_unused, index) => block('stageDirection', `sd${index}`, `Line number ${index} on the page.`));
        const transcript = transcribeExportPlan(plan([
            block('scene', 's1', 'Scene one'),
            ...fillers,
            block('character', 'lastHeading', 'ISABELLA'),
            block('dialogue', 'd1', 'A closing line of dialogue.'),
        ]), DEFAULT_EDITOR_SETTINGS);

        const breakIndex = transcript.items.findIndex(item => 'type' in item && item.type === '__page_break__');
        const headingIndex = transcript.items.findIndex(item => !('type' in item) && item.runs.some(run => run.text === 'ISABELLA'));

        // The heading lands AFTER the page break (kept with its dialogue), not before.
        expect(breakIndex).toBeGreaterThan(-1);
        expect(headingIndex).toBeGreaterThan(breakIndex);
    });
});
