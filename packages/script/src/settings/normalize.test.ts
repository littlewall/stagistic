import {
    describe, expect, it,
} from 'vite-plus/test';

import {normalizeEditorSettingsBlockType} from './normalize';

describe('normalizeEditorSettingsBlockType', () => {
    it('returns valid block node types unchanged', () => {
        expect(normalizeEditorSettingsBlockType('scene')).toBe('scene');
        expect(normalizeEditorSettingsBlockType('act')).toBe('act');
        expect(normalizeEditorSettingsBlockType('dialogue')).toBe('dialogue');
        expect(normalizeEditorSettingsBlockType('stageDirection')).toBe('stageDirection');
    });

    it('rejects the snake_case block type vocabulary (node types only)', () => {
        expect(normalizeEditorSettingsBlockType('stage_direction')).toBeNull();
    });

    it('rejects unknown strings', () => {
        expect(normalizeEditorSettingsBlockType('paragraph')).toBeNull();
        expect(normalizeEditorSettingsBlockType('')).toBeNull();
    });

    it('rejects non-string values', () => {
        expect(normalizeEditorSettingsBlockType(42)).toBeNull();
        expect(normalizeEditorSettingsBlockType(null)).toBeNull();
        expect(normalizeEditorSettingsBlockType(undefined)).toBeNull();
        expect(normalizeEditorSettingsBlockType({type: 'scene'})).toBeNull();
    });
});
