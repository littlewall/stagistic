import type {ScriptBlockNodeType} from '@stagistic/script';
import {isApplePlatform} from '@stagistic/shared';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {formatBlockCycleShortcutLabel} from '../../model/formatBlockShortcut';
import {getEditorStatusBarSegments} from './EditorStatusBar';

const quickToggleKey = isApplePlatform() ? '⌥⇥' : 'Alt+Tab';
const shiftEnterKey = isApplePlatform() ? '⇧⏎' : 'Shift+Enter';

const getSegments = (
    activeType: ScriptBlockNodeType,
    nextType: ScriptBlockNodeType,
    isActiveBlockEmpty = false,
) => getEditorStatusBarSegments(activeType, {
    [activeType]: nextType,
}, isActiveBlockEmpty);

const getEnterSegments = (
    activeType: 'dialogue' | 'lyrics',
    nextType: ScriptBlockNodeType,
    isActiveBlockEmpty: boolean,
) => getSegments(activeType, nextType, isActiveBlockEmpty)
    .filter(segment => segment.id === 'enter' || segment.id === 'shift-enter');

describe('getEditorStatusBarSegments', () => {
    it.each([
        {
            blockType: 'lyrics',
            isEmpty: false,
            enterType: 'Lyrics',
            shiftEnterType: 'Lyrics',
        },
        {
            blockType: 'lyrics',
            isEmpty: true,
            enterType: 'Character',
            shiftEnterType: 'Lyrics',
        },
        {
            blockType: 'dialogue',
            isEmpty: false,
            enterType: 'Character',
            shiftEnterType: 'Dialogue',
        },
        {
            blockType: 'dialogue',
            isEmpty: true,
            enterType: 'Character',
            shiftEnterType: 'Dialogue',
        },
    ] as const)(
        'shows accurate Enter shortcuts for $blockType when empty is $isEmpty',
        ({
            blockType,
            isEmpty,
            enterType,
            shiftEnterType,
        }) => {
            const defaultNextType = blockType === 'lyrics' ? 'lyrics' : 'character';

            expect(getEnterSegments(blockType, defaultNextType, isEmpty)).toEqual([
                {
                    id: 'enter',
                    key: '⏎',
                    description: enterType,
                }, {
                    id: 'shift-enter',
                    key: shiftEnterKey,
                    description: shiftEnterType,
                },
            ]);
        },
    );

    it('shows the lyrics destination instead of the active block shortcut for dialogue', () => {
        expect(getSegments('dialogue', 'lyrics')).toEqual([
            {
                id: 'enter',
                key: '⏎',
                description: 'Lyrics',
            },
            {
                id: 'shift-enter',
                key: shiftEnterKey,
                description: 'Dialogue',
            },
            {
                id: 'quick-toggle',
                key: quickToggleKey,
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
            id: 'quick-toggle',
            key: quickToggleKey,
            description: 'Switch to dialogue',
        });
    });

    it('shows stage direction as the Option Tab destination for character', () => {
        const segments = getSegments('character', 'dialogue');

        expect(segments).toContainEqual({
            id: 'quick-toggle',
            key: quickToggleKey,
            description: 'Switch to stage direction',
        });
    });

    it('shows character as the Option Tab destination for stage direction', () => {
        const segments = getSegments('stageDirection', 'character');

        expect(segments).toContainEqual({
            id: 'quick-toggle',
            key: quickToggleKey,
            description: 'Switch to character',
        });
    });
});
