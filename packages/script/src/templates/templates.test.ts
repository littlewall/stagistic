import {requireValue} from '@stagistic/shared';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    DEFAULT_EDITOR_SETTINGS,
    mergeEditorSettings,
} from '../settings';
import {
    ALL_FORMAT_TEMPLATES,
    FORMAT_TEMPLATE_IDS,
    getFormatTemplate,
} from './index';

describe('format templates', () => {
    it('defines exactly the six phase-one templates', () => {
        expect(FORMAT_TEMPLATE_IDS).toEqual([
            'stagistic-default',
            'dg-traditional',
            'dg-modern',
            'dg-musical',
            'samuel-french',
            'sketch-comedy',
        ]);
        expect(new Set(ALL_FORMAT_TEMPLATES.map(template => template.id)).size).toBe(6);
        expect(getFormatTemplate('unknown')).toBeUndefined();
    });

    it('keeps Stagistic Default an identity', () => {
        expect(mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, requireValue(getFormatTemplate('stagistic-default')).settings)).toEqual(DEFAULT_EDITOR_SETTINGS);
    });

    it('maps the researched indents and continuation marks', () => {
        const modern = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, requireValue(getFormatTemplate('dg-modern')).settings);

        expect(modern.blocks.character.indentLeftChars).toBe(25);
        expect(modern.blocks.stageDirection.indentLeftChars).toBe(25);
        expect(modern.blocks.dialogue.indentLeftChars).toBe(0);
        expect(modern.page).toEqual(DEFAULT_EDITOR_SETTINGS.page);
        expect(requireValue(getFormatTemplate('dg-traditional')).settings.blocks?.stageDirection?.indentLeftChars).toBe(15);
        for (const id of [
            'dg-traditional',
            'dg-musical',
            'samuel-french',
        ]) expect(requireValue(getFormatTemplate(id)).settings.blocks?.stageDirection?.parenWrap).toBe(true);
    });

    it('never presets script preferences or block typing behavior', () => {
        for (const template of ALL_FORMAT_TEMPLATES) {
            expect(Object.keys(template.settings).every(key => ['blocks'].includes(key))).toBe(true);
            for (const block of Object.values(template.settings.blocks ?? {})) {
                expect(block).not.toHaveProperty('shortcut');
                expect(block).not.toHaveProperty('nextElement');
            }
        }
    });
});
