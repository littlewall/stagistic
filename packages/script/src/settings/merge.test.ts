import {
    describe, expect, it,
} from 'vite-plus/test';

import {DEFAULT_EDITOR_SETTINGS} from './defaults';
import {mergeEditorSettings} from './merge';

describe('mergeEditorSettings', () => {
    it('returns a deep copy when given no overrides', () => {
        const result = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS);

        expect(result).toEqual(DEFAULT_EDITOR_SETTINGS);
        expect(result).not.toBe(DEFAULT_EDITOR_SETTINGS);
        expect(result.page).not.toBe(DEFAULT_EDITOR_SETTINGS.page);
        expect(result.structure.actDisplay).not.toBe(DEFAULT_EDITOR_SETTINGS.structure.actDisplay);
    });

    it('skips null and undefined overrides', () => {
        const result = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, null, undefined);

        expect(result).toEqual(DEFAULT_EDITOR_SETTINGS);
    });

    it('does not mutate the base settings', () => {
        const baseWidth = DEFAULT_EDITOR_SETTINGS.page.widthPx;

        mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, {page: {widthPx: 1234}});

        expect(DEFAULT_EDITOR_SETTINGS.page.widthPx).toBe(baseWidth);
    });

    it('merges page values and ignores undefined fields', () => {
        const result = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, {
            page: {widthPx: 1000, heightPx: undefined},
        });

        expect(result.page.widthPx).toBe(1000);
        expect(result.page.heightPx).toBe(DEFAULT_EDITOR_SETTINGS.page.heightPx);
    });

    it('merges typography and visual overrides', () => {
        const result = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, {
            typography: {fontSizePx: 22},
            visual: {characterColorSaturation: 30},
        });

        expect(result.typography.fontSizePx).toBe(22);
        expect(result.typography.lineHeight).toBe(DEFAULT_EDITOR_SETTINGS.typography.lineHeight);
        expect(result.visual.characterColorSaturation).toBe(30);
    });

    it('merges a partial structure actDisplay patch', () => {
        const result = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, {
            structure: {actDisplay: {linesBefore: 5}},
        });

        expect(result.structure.actDisplay.linesBefore).toBe(5);
        expect(result.structure.actDisplay.linesAfter)
            .toBe(DEFAULT_EDITOR_SETTINGS.structure.actDisplay.linesAfter);
    });

    it('merges per-block settings for valid node-type keys', () => {
        const result = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, {
            blocks: {dialogue: {fontSizePx: 99}},
        });

        expect(result.blocks.dialogue.fontSizePx).toBe(99);
    });

    it('skips block overrides keyed by an invalid block type', () => {
        const result = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, {
            blocks: {stage_direction: {fontSizePx: 5}},
        });

        expect(result.blocks).not.toHaveProperty('stage_direction');
    });

    it('applies later overrides on top of earlier ones', () => {
        const result = mergeEditorSettings(
            DEFAULT_EDITOR_SETTINGS,
            {page: {widthPx: 500}},
            {page: {widthPx: 800}},
        );

        expect(result.page.widthPx).toBe(800);
    });
});
