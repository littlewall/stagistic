import {requireValue} from '@stagistic/shared';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {getFormatTemplate} from '../templates';
import {DEFAULT_EDITOR_SETTINGS} from './defaults';
import {mergeEditorSettings} from './merge';
import {resolveScriptEditorSettings} from './resolveScriptEditorSettings';

describe('resolveScriptEditorSettings', () => {
    it('resolves locked block styles live while preserving page overrides', () => {
        const actual = resolveScriptEditorSettings({formatTemplateId: 'dg-modern', override: {blocks: {character: {indentLeftChars: 1}}, page: {widthPx: 1}}});

        expect(actual).toEqual(mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, requireValue(getFormatTemplate('dg-modern')).settings, {page: {widthPx: 1}}));
    });

    it('resolves custom overrides as before', () => {
        const override = {blocks: {character: {indentLeftChars: 1}}};

        expect(resolveScriptEditorSettings({formatTemplateId: null, override})).toEqual(mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, override));
    });

    it('preserves Script preferences, Typing and free header cells while locked', () => {
        const actual = resolveScriptEditorSettings({
            formatTemplateId: 'dg-modern',
            override: {
                visual: {characterDecoration: 'none'},
                initialPages: {songs: {showCharactersInSongs: true}},
                headerFooter: {header: {left: {text: 'My play'}, right: {text: 'stale'}}},
                blocks: {character: {
                    shortcut: '3',
                    nextElement: 'aside',
                    indentLeftChars: 1,
                }},
            },
        });

        expect(actual.visual.characterDecoration).toBe('none');
        expect(actual.initialPages.songs.showCharactersInSongs).toBe(true);
        expect(actual.blocks.character).toMatchObject({
            shortcut: '3',
            nextElement: 'aside',
            indentLeftChars: 25,
        });
        expect(actual.headerFooter.header.left.text).toBe('My play');
        expect(actual.headerFooter.header.right.text).toBe('{{page}}.');
    });
});
