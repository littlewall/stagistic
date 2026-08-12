import type {ScriptBlockNodeType} from '@stagistic/script';
import {isApplePlatform} from '@stagistic/shared';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {formatBlockCycleShortcutLabel} from '../../model/formatBlockShortcut';
import {getEditorStatusBarSegments} from './EditorStatusBar';

const lyricsToggleKey = isApplePlatform() ? '⌥⇥' : 'Alt+Tab';

const getSegments = (
    activeType: ScriptBlockNodeType,
    nextType: ScriptBlockNodeType,
) => getEditorStatusBarSegments(activeType, {
    [activeType]: nextType,
});

describe('getEditorStatusBarSegments', () => {
    it('shows the lyrics destination instead of the active block shortcut for dialogue', () => {
        expect(getSegments('dialogue', 'lyrics')).toEqual([
            {
                id: 'enter',
                key: '⏎',
                description: 'Lyrics',
            },
            {
                id: 'lyrics-toggle',
                key: lyricsToggleKey,
                description: 'Switch to lyrics',
            },
            {
                id: 'cycle',
                key: formatBlockCycleShortcutLabel(),
                description: 'Change type (lyrics)',
            },
        ]);
    });

    it('shows dialogue as the Option Tab destination for lyrics', () => {
        const segments = getSegments('lyrics', 'dialogue');

        expect(segments).toContainEqual({
            id: 'lyrics-toggle',
            key: lyricsToggleKey,
            description: 'Switch to dialogue',
        });
    });
});
