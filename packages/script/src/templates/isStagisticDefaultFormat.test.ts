import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {DEFAULT_EDITOR_SETTINGS} from '../settings/defaults';
import {mergeEditorSettings} from '../settings/merge';
import type {EditorSettingsOverride} from '../settings/types';
import {applyFormatTemplate} from './applyFormatTemplate';
import {isDefaultBlockSettings, isStagisticDefaultFormat} from './isStagisticDefaultFormat';

describe('isStagisticDefaultFormat', () => {
    it('recognizes default values regardless of property order or object identity', () => {
        const reordered = {...DEFAULT_EDITOR_SETTINGS, typography: {lineHeight: 1.2, fontSizePx: 16}};

        expect(isStagisticDefaultFormat(reordered)).toBe(true);
    });

    it.each<EditorSettingsOverride>([
        {blocks: {character: {indentLeftChars: 21}}},
        {blocks: {stageDirection: {parenWrap: true}}},
    ])('detects changed format values: %j', override => {
        expect(isStagisticDefaultFormat(mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, override))).toBe(false);
    });

    it('recognizes a reset while preserving Script and Typing preferences', () => {
        const previous: EditorSettingsOverride = {
            page: {widthPx: 816},
            visual: {characterDecoration: 'none'},
            initialPages: {songs: {showCharactersInSongs: true}},
            structure: {actDisplay: {linesBefore: 3}},
            blocks: {character: {
                shortcut: '5',
                nextElement: 'aside',
                indentLeftChars: 25,
            }},
        };
        const reset = applyFormatTemplate({templateId: 'stagistic-default', lock: false}, previous);

        expect(isStagisticDefaultFormat(mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, reset.settings))).toBe(true);
    });

    it('recognizes explicit off, zero and inherited font values as default', () => {
        const settings = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, {
            blocks: {stageDirection: {
                parenWrap: false,
                spacingAfterEm: 0,
                fontSizePx: 16,
            }},
        });

        expect(isStagisticDefaultFormat(settings)).toBe(true);
    });
});

describe('isDefaultBlockSettings', () => {
    it.each<{override: EditorSettingsOverride, expected: boolean}>([
        {override: {}, expected: true},
        {
            override: {blocks: {character: {
                indentLeftChars: 20,
                shortcut: '3',
                nextElement: 'dialogue',
            }}},
            expected: true,
        },
        {override: {blocks: {character: {spacingAfterEm: 0, parenWrap: false}}}, expected: true},
        {override: {typography: {fontSizePx: 20}, blocks: {dialogue: {isBold: true}}}, expected: true},
        {override: {blocks: {character: {indentLeftChars: 25}}}, expected: false},
        {override: {blocks: {character: {shortcut: '5'}}}, expected: false},
        {override: {blocks: {character: {nextElement: 'aside'}}}, expected: false},
    ])('detects actual block and Typing changes: %j', ({override, expected}) => {
        const settings = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, override);

        expect(isDefaultBlockSettings(settings, 'character')).toBe(expected);
    });
});
