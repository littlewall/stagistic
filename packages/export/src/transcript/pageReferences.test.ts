import {DEFAULT_EDITOR_SETTINGS, mergeEditorSettings} from '@stagistic/script';
import {expect, it} from 'vite-plus/test';

import {buildContentsPages} from '../initialPages/contents/buildContentsPages';
import {deriveContentsPlan} from '../initialPages/contents/deriveContentsPlan';
import {BASIC_DEFAULTS, INTEGRATED_SCORE_DEFAULTS} from '../model/config';
import type {VisualLine} from '../model/visualLine';
import {deriveBasicExportPlan} from '../plan/deriveBasicExportPlan';
import {deriveIntegratedScoreExportPlan} from '../plan/deriveIntegratedScoreExportPlan';
import {numberedScript} from '../test/numberedScript';
import {transcribeExportPlan} from './transcribeExportPlan';

const emptyFooter = {
    left: {text: ''},
    center: {text: ''},
    right: {text: ''},
};

it('uses the printed compound book label in basic Contents when continuous numbering is off', () => {
    const settings = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, {headerFooter: {header: {right: {text: '{{page}}.'}}, footer: emptyFooter}});
    const plan = deriveBasicExportPlan({...BASIC_DEFAULTS, pageBreaks: {...BASIC_DEFAULTS.pageBreaks, sceneOnOddPage: true}}, numberedScript);
    const result = transcribeExportPlan(plan, settings);
    const lines = result.items.filter((item): item is VisualLine => !('type' in item));
    const reference = lines.find(line => line.runs[0]?.text === '2. Second')?.runs.at(-1)?.text;

    expect(reference).toBe('I-2-2');
    expect(lines.some(line => line.runs.some(run => run.text === `${reference}.`))).toBe(true);
});

it('provides a visible integrated sequence and matching Contents without a continuous footer', () => {
    const settings = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, {headerFooter: {header: {right: {text: '{{page}}.'}}, footer: emptyFooter}});
    const plan = deriveIntegratedScoreExportPlan(INTEGRATED_SCORE_DEFAULTS, numberedScript);
    const result = transcribeExportPlan(plan, settings, {scorePageCounts: {song: 2}});
    const lines = result.items.filter((item): item is VisualLine => !('type' in item));
    const reference = lines.find(line => line.runs[0]?.text === '2. Second')?.runs.at(-1)?.text;

    expect(result.integratedFooter?.text).toBe('{{page_number}}');
    expect(reference).toBe('7');
    expect(lines.some(line => !line.sourceBlockId && line.runs.some(run => run.text === '7.'))).toBe(true);

    const songContents = lines.find(line => line.runs.some(run => run.text.includes('1) Song')) && line.sourceBlockId !== 'cue');
    const anySongLine = lines.find(line => line.runs[0]?.text === '1) Song');

    expect((songContents ?? anySongLine)?.runs.at(-1)?.text).toBe('5');
});

it('keeps a custom footer clear of the independent integrated number', () => {
    const settings = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, {page: {marginBottomPx: 0}, headerFooter: {footer: {center: {text: 'Private reading copy'}}}});
    const result = transcribeExportPlan(deriveIntegratedScoreExportPlan(INTEGRATED_SCORE_DEFAULTS, numberedScript), settings, {scorePageCounts: {song: 1}});
    const lines = result.items.filter((item): item is VisualLine => !('type' in item));
    const footer = lines.find(line => line.runs.some(run => run.text === 'Private reading copy'));
    const number = lines.find(line => !line.sourceBlockId && line.runs[0]?.text === '1.');

    expect(footer).toBeDefined();
    expect(number).toBeDefined();
    expect((number?.y ?? 0) - (footer?.y ?? 0)).toBeGreaterThanOrEqual(settings.typography.fontSizePx * settings.typography.lineHeight);
    expect((number?.y ?? 0) + settings.typography.fontSizePx).toBeLessThanOrEqual(settings.page.heightPx);
});

it('reserves room for long compound labels in musical-number Contents', () => {
    const doc = {
        ...numberedScript.doc,
        content: numberedScript.doc.content.map(node => (node.attrs?.id === 'cue' ? {
            ...node,
            content: [
                {
                    type: 'musicStart',
                    attrs: {
                        musicId: 'song',
                        mode: 'open',
                        title: 'a '.repeat(100),
                    },
                },
            ],
        } : node)),
    };
    const contents = deriveContentsPlan({enabled: true, variant: 'musical-numbers'}, doc, [], []);

    if (!contents) throw new Error('Missing contents');

    const pages = buildContentsPages(contents, DEFAULT_EDITOR_SETTINGS, {scriptPageNumberByBlockId: new Map([['cue', 'VIII-12-1234']]), scoreStartPageByMusicId: new Map()});
    const row = pages.flat().find(line => line.runs.some(run => run.text === 'VIII-12-1234'));
    const title = row?.runs[0];
    const reference = row?.runs.at(-1);

    expect(title).toBeDefined();
    expect(reference).toBeDefined();
    expect((title?.x ?? 0) + (title?.text.length ?? 0) * 9.6).toBeLessThanOrEqual((reference?.x ?? 0) - 9.6);
});
