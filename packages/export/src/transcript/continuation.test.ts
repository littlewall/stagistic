import {DEFAULT_EDITOR_SETTINGS, mergeEditorSettings} from '@stagistic/script';
import {expect, it} from 'vite-plus/test';

import {BASIC_DEFAULTS} from '../model/config';
import {deriveBasicExportPlan} from '../plan/deriveBasicExportPlan';
import {block} from '../test/testUtils';
import {transcribeExportPlan} from './transcribeExportPlan';

const script = {
    doc: {type: 'doc' as const, content: [block('character', 'cue', 'MARA'), block('dialogue', 'speech', 'Every word matters. '.repeat(600))]},
    characters: [],
    groups: [],
    initialCharacters: [],
    initialPlaces: [],
    initialVocalRanges: [],
    scriptTitle: '',
    titlePage: null,
};
const settings = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, {page: {heightPx: 640}});
const transcript = (mark: 'none' | 'contd' | 'cont', repeat = true) => transcribeExportPlan(deriveBasicExportPlan({
    ...BASIC_DEFAULTS,
    pageBreaks: {
        ...BASIC_DEFAULTS.pageBreaks,
        repeatCharacterOnBreak: repeat,
        continuationMark: mark,
    },
}, script), settings);
const texts = (mark: 'none' | 'contd' | 'cont', repeat = true) => transcript(mark, repeat).items.flatMap(item => ('runs' in item ? item.runs.map(run => run.text) : []));

it('defaults continuation marks to none', () => {
    expect(BASIC_DEFAULTS.pageBreaks.continuationMark).toBe('none');
});

it('repeats the character with the chosen continuation mark after dialogue splits', () => {
    expect(texts('contd').filter(text => text === 'MARA (CONT\'D)').length).toBeGreaterThan(1);
    expect(texts('cont').filter(text => text === 'MARA (Cont.)').length).toBeGreaterThan(1);
    expect(texts('none').filter(text => text === 'MARA').length).toBeGreaterThan(1);
    expect(texts('contd', false).filter(text => text.includes('CONT\'D'))).toHaveLength(0);
});

it('reserves room for repeated cues without overflowing the page', () => {
    const output = transcript('contd');

    expect(output.items.filter(item => 'runs' in item && item.runs.some(run => run.text.includes('Every'))).every(item => 'y' in item && item.y + 19.2 <= settings.page.heightPx - settings.page.marginBottomPx + 0.01)).toBe(true);
});
