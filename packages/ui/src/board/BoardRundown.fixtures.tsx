import '../../styles/tokens.css';

import type {SceneNumberFormat} from '@stagistic/script';
import {requireValue} from '@stagistic/shared';
import {createRoot, type Root} from 'react-dom/client';

import {FocusVisibilityManager} from '../layout/FocusVisibilityManager';
import type {BoardCharacterChip} from './BoardCharacterDot';
import {
    BoardRundown,
    type BoardRundownAct,
    type BoardRundownSong,
} from './BoardRundown';

let root: Root | null = null;

export const chip = (name: string, color: string | null): BoardCharacterChip => ({
    id: name,
    characterId: color ? `c-${name}` : null,
    name,
    color,
    source: 'script',
    note: null,
});

export const MARA = chip('MARA', '#cc3344');
export const ELI = chip('ELI', '#2266cc');
export const ROOK = chip('ROOK', null);

export const song = (overrides: Partial<BoardRundownSong>): BoardRundownSong => ({
    musicId: 'm1',
    startBlockId: 'd1',
    label: '1.A)',
    title: 'Small Light',
    kind: 'song',
    singers: [MARA, ELI],
    pageLength: null,
    ...overrides,
});

export const ACTS: BoardRundownAct[] = [
    {
        key: 'a1',
        name: 'ACT ONE',
        sceneCount: 2,
        songCount: 2,
        pageLength: null,
        scenes: [
            {
                headingBlockId: 's1',
                number: 1,
                title: 'The Lighthouse',
                chips: [
                    MARA,
                    ELI,
                    ROOK,
                ],
                pageLength: null,
                songs: [
                    song({}),
                    song({
                        musicId: 'm2',
                        startBlockId: 'x1',
                        label: '1.B)',
                        title: 'Storm',
                        kind: 'instrumental',
                        singers: [],
                    }),
                ],
            },
            {
                headingBlockId: 's2',
                number: 2,
                title: 'The Harbour',
                chips: [ROOK],
                pageLength: null,
                songs: [],
            },
        ],
    },
];

export const PRE: BoardRundownSong[] = [
    song({
        musicId: 'm0',
        startBlockId: 'p0',
        label: '0)',
        title: 'Overture',
        kind: 'hit',
        singers: [],
    }),
];

export const mount = (
    onOpen: (blockId: string) => void = () => {},
    acts: BoardRundownAct[] = ACTS,
    sceneNumberFormat?: SceneNumberFormat,
) => {
    const host = document.createElement('div');

    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <>
            <FocusVisibilityManager />
            <BoardRundown
                acts={acts}
                preSceneSongs={PRE}
                onOpen={onOpen}
                sceneNumberFormat={sceneNumberFormat}
            />
        </>,
    );
};

export const row = (label: string) => requireValue(document.querySelector<HTMLElement>(`[data-row][aria-label="${label}"]`), label);

export const waitFor = async <T,>(read: () => T | null | undefined | false): Promise<T> => {
    const deadline = Date.now() + 1500;

    while (Date.now() < deadline) {
        const value = read();

        if (value) return value;

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Condition not met in time');
};

export const unmount = () => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
};
