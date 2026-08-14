import type {ScriptBlockNodeType} from '@stagistic/script';
import {isApplePlatform} from '@stagistic/shared';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {formatBlockCycleShortcutLabel} from '../../model/formatBlockShortcut';
import {
    type EditorStatusBarBlockState,
    getEditorStatusBarSegments,
} from './EditorStatusBar';

const quickToggleKey = isApplePlatform() ? '⌥⇥' : 'Alt+Tab';
const shiftEnterKey = isApplePlatform() ? '⇧⏎' : 'Shift+Enter';
const tabKey = isApplePlatform() ? '⇥' : 'Tab';

/*
 * The caret sitting at the end of a non-empty block is the ordinary writing
 * position, so it's the baseline every case here starts from.
 */
const getSegments = (
    activeType: ScriptBlockNodeType,
    nextType: ScriptBlockNodeType,
    blockState: Partial<EditorStatusBarBlockState> = {},
) => getEditorStatusBarSegments(activeType, {
    [activeType]: nextType,
}, {
    isEmpty: false,
    hasOnlyNonTextContent: false,
    isAtStart: false,
    isAtEnd: true,
    asideFlowTarget: null,
    asideToggleTarget: null,
    ...blockState,
});

const getEnterSegments = (
    activeType: ScriptBlockNodeType,
    nextType: ScriptBlockNodeType,
    blockState: Partial<EditorStatusBarBlockState> = {},
) => getSegments(activeType, nextType, blockState)
    .filter(segment => segment.id === 'enter' || segment.id === 'shift-enter');

describe('getEditorStatusBarSegments', () => {
    it.each([
        {
            blockType: 'lyrics',
            isEmpty: false,
            enterType: 'Lyrics',
            // Enter already produces lyrics here - Shift+Enter would only say
            // the same thing with a harder chord.
            shiftEnterType: null,
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
            const expected: {id: string, key: string, description: string}[] = [
                {
                    id: 'enter',
                    key: '⏎',
                    description: enterType,
                },
            ];

            if (shiftEnterType) {
                expected.push({
                    id: 'shift-enter',
                    key: shiftEnterKey,
                    description: shiftEnterType,
                });
            }

            expect(getEnterSegments(blockType, defaultNextType, {isEmpty})).toEqual(expected);
        },
    );

    it('drops the Shift+Enter hint when a mid-block Enter already continues the same type', () => {
        expect(getEnterSegments('dialogue', 'character', {isAtEnd: false})).toEqual([
            {
                id: 'enter',
                key: '⏎',
                description: 'Dialogue',
            },
        ]);
    });

    it('shows the configured next type only while the caret sits at the block end', () => {
        expect(getEnterSegments('dialogue', 'character')).toEqual([
            {
                id: 'enter',
                key: '⏎',
                description: 'Character',
            },
            {
                id: 'shift-enter',
                key: shiftEnterKey,
                description: 'Dialogue',
            },
        ]);
    });

    it('announces the type chooser for an empty block that opens one on Enter', () => {
        expect(getEnterSegments('scene', 'stageDirection', {isEmpty: true})).toEqual([
            {
                id: 'enter',
                key: '⏎',
                description: 'Choose type',
            },
        ]);
    });

    it('announces the stage direction a character block gets when Enter fires at its start', () => {
        expect(getEnterSegments('character', 'dialogue', {
            isAtEnd: false,
            isAtStart: true,
        })).toEqual([
            {
                id: 'enter',
                key: '⏎',
                description: 'Stage direction',
            },
        ]);
    });

    it('shows the lyrics destination instead of the active block shortcut for dialogue', () => {
        expect(getSegments('dialogue', 'lyrics', {asideToggleTarget: 'aside'})).toEqual([
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
                id: 'aside-toggle',
                key: tabKey,
                description: 'Switch to aside',
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

    it('shows aside as the Tab destination for lyrics', () => {
        const segments = getSegments('lyrics', 'lyrics', {asideToggleTarget: 'aside'});

        expect(segments).toContainEqual({
            id: 'aside-toggle',
            key: tabKey,
            description: 'Switch to aside',
        });
    });

    it('shows the resumed flow type as the Tab destination for an aside', () => {
        const segments = getSegments('aside', 'dialogue', {
            asideFlowTarget: 'lyrics',
            asideToggleTarget: 'lyrics',
        });

        expect(segments).toContainEqual({
            id: 'aside-toggle',
            key: tabKey,
            description: 'Switch to lyrics',
        });
    });

    it('shows lyrics on Enter for an aside that interrupted a song', () => {
        expect(getEnterSegments('aside', 'dialogue', {
            asideFlowTarget: 'lyrics',
            asideToggleTarget: 'lyrics',
        })).toEqual([
            {
                id: 'enter',
                key: '⏎',
                description: 'Lyrics',
            },
        ]);
    });

    it('omits the Tab hint where Tab does not toggle an aside', () => {
        const segments = getSegments('stageDirection', 'character');

        expect(segments.some(segment => segment.id === 'aside-toggle')).toBe(false);
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
