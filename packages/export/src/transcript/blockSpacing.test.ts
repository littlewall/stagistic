import {DEFAULT_EDITOR_SETTINGS, mergeEditorSettings} from '@stagistic/script';
import {expect, it} from 'vite-plus/test';

import {BASIC_DEFAULTS} from '../model/config';
import type {VisualLine} from '../model/visualLine';
import {deriveBasicExportPlan} from '../plan/deriveBasicExportPlan';
import {block} from '../test/testUtils';
import {transcribeExportPlan} from './transcribeExportPlan';

it.each([
    'dialogue',
    'lyrics',
    'stageDirection',
    'character',
    'aside',
    'note',
    'act',
    'scene',
])('applies spacing around the whole %s run in PDF', type => {
    const settings = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, {blocks: {[type]: {
        spacingBeforeEm: 1,
        spacingAfterEm: 1,
        fontSizePx: 16,
        lineHeight: 1.2,
    }}});
    const plan = deriveBasicExportPlan({
        ...BASIC_DEFAULTS,
        pageBreaks: {
            actOnNewPage: false,
            sceneOnNewPage: false,
            sceneOnOddPage: false,
        },
    }, {
        doc: {
            type: 'doc',
            content: [
                block(type, 'a', 'One'),
                block(type, 'b', ''),
                block(type, 'c', 'Three'),
                block('note', 'end', 'End'),
            ],
        },
        scriptTitle: '',
        titlePage: null,
        characters: [],
        groups: [],
        initialCharacters: [],
        initialPlaces: [],
        initialVocalRanges: [],
    });
    const lines = transcribeExportPlan(plan, settings).items.filter((item): item is VisualLine => !('type' in item) && Boolean(item.sourceBlockId));
    const a = lines.findLast(line => line.sourceBlockId === 'a');
    const b = lines.findLast(line => line.sourceBlockId === 'b');
    const c = lines.findLast(line => line.sourceBlockId === 'c');

    expect(a?.y).toBeCloseTo(settings.page.marginTopPx + 16);

    const step = ['act', 'scene'].includes(type) ? 51.2 : 19.2;

    expect((b?.y ?? 0) - (a?.y ?? 0)).toBeCloseTo(step);
    expect((c?.y ?? 0) - (b?.y ?? 0)).toBeCloseTo(step);
});

it('does not reapply group padding when a paragraph continues on another page', () => {
    const settings = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, {
        page: {
            heightPx: 240,
            marginTopPx: 20,
            marginBottomPx: 20,
        },
        blocks: {lyrics: {
            spacingBeforeEm: 1,
            spacingAfterEm: 1,
            lineHeight: 1.2,
        }},
    });
    const plan = deriveBasicExportPlan({
        ...BASIC_DEFAULTS,
        pageBreaks: {
            actOnNewPage: false,
            sceneOnNewPage: false,
            sceneOnOddPage: false,
        },
    }, {
        doc: {
            type: 'doc',
            content: [
                block('lyrics', 'a', 'First'),
                block('lyrics', 'b', 'Long lyric line with several words. '.repeat(50)),
                block('lyrics', 'c', 'Last'),
            ],
        },
        scriptTitle: '',
        titlePage: null,
        characters: [],
        groups: [],
        initialCharacters: [],
        initialPlaces: [],
        initialVocalRanges: [],
    });
    const result = transcribeExportPlan(plan, settings);
    const pages: VisualLine[][] = [[]];

    result.items.forEach(item => {
        if ('type' in item) {
            if (item.type === '__page_break__') pages.push([]);

            return;
        }

        if (item.sourceBlockId) pages.at(-1)?.push(item);
    });

    const body = pages.slice(result.leadingPageCount);

    expect(body[0]?.find(line => line.sourceBlockId === 'a')?.y).toBe(36);
    expect(body.filter(page => page.some(line => line.sourceBlockId === 'b')).length).toBeGreaterThan(1);
    body.slice(1).filter(page => page[0]?.sourceBlockId === 'b').forEach(page => {
        expect(page[0].y).toBe(20);
    });

    const lastPage = body.find(page => page.some(line => line.sourceBlockId === 'c')) ?? [];
    const previous = lastPage.filter(line => line.sourceBlockId === 'b').at(-1);
    const last = lastPage.find(line => line.sourceBlockId === 'c');

    expect(last?.y).toBeCloseTo(previous ? previous.y + 19.2 : 20);
});
