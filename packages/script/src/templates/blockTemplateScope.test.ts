import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    DEFAULT_EDITOR_SETTINGS,
    mergeEditorSettings,
    resolveScriptEditorSettings,
} from '../settings';
import {
    ALL_FORMAT_TEMPLATES,
    applyFormatTemplate,
    isStagisticDefaultFormat,
} from './index';

const independent = {
    page: {widthPx: 900, marginLeftPx: 70},
    typography: {fontSizePx: 20, lineHeight: 1.5},
    headerFooter: {header: {right: {text: 'My header'}}, footer: {center: {text: '{{page_number}}'}}},
    pdfFlow: {
        actOnNewPage: false,
        sceneOnNewPage: true,
        repeatCharacterOnBreak: false,
        continuationMark: 'none' as const,
    },
};

describe('block template scope', () => {
    it.each(ALL_FORMAT_TEMPLATES.flatMap(template => [false, true].map(lock => ({template, lock}))))('preserves independent settings for $template.id (lock=$lock)', ({template, lock}) => {
        const previous = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, independent, {blocks: {character: {shortcut: '5', nextElement: 'aside'}}});
        const applied = applyFormatTemplate({templateId: template.id, lock}, previous);
        const actual = resolveScriptEditorSettings({formatTemplateId: applied.formatTemplateId, override: applied.settings});

        expect(actual.page).toEqual(previous.page);
        expect(actual.typography).toEqual(previous.typography);
        expect(actual.headerFooter).toEqual(previous.headerFooter);
        expect(actual.pdfFlow).toEqual(previous.pdfFlow);
        expect(actual.blocks.character).toMatchObject({shortcut: '5', nextElement: 'aside'});

        if (template.id !== 'stagistic-default') expect(actual.blocks.character.indentLeftChars).toBe(template.settings.blocks?.character?.indentLeftChars);
    });

    it('keeps page values editable under a lock and derives default from block styles only', () => {
        const applied = applyFormatTemplate({templateId: 'dg-modern', lock: true});
        const actual = resolveScriptEditorSettings({formatTemplateId: applied.formatTemplateId, override: {...applied.settings, ...independent}});

        expect(actual.pdfFlow.sceneOnNewPage).toBe(true);
        expect(actual.page.widthPx).toBe(900);
        expect(actual.headerFooter.header.right.text).toBe('My header');
        expect(isStagisticDefaultFormat(mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, independent))).toBe(true);
    });

    it('preserves the former page profile when opening a legacy page-less locked payload', () => {
        const actual = resolveScriptEditorSettings({formatTemplateId: 'samuel-french', override: {blocks: {character: {shortcut: '5'}}}});

        expect(actual.page.widthPx).toBe(816);
        expect(actual.typography.lineHeight).toBe(1);
        expect(actual.pdfFlow.continuationMark).toBe('cont');
        expect(actual.headerFooter.header.right.text).toBe('{{page}}.');
        expect(actual.headerFooter.footer.center.text).toBe('');

        const reapplied = applyFormatTemplate({templateId: 'dg-modern', lock: true}, actual);
        const next = resolveScriptEditorSettings({formatTemplateId: reapplied.formatTemplateId, override: reapplied.settings});

        expect(next.page).toEqual(actual.page);
        expect(next.pdfFlow).toEqual(actual.pdfFlow);
        expect(next.headerFooter).toEqual(actual.headerFooter);
    });
});
