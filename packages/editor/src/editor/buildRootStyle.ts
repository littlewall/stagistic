import type {CSSProperties} from 'react';

import {getCharacterColorVarName, normalizeCharacterColorHex} from './characters/characterColors';
import type {PersistentCharacterRef} from './contracts';

type BuildEditorRootStyleArgs = {
    persistentCharacters: readonly PersistentCharacterRef[];
    editorStyle: CSSProperties;
    sidebarWidth?: string;
    /** Unscaled on-screen page width; lets sidebars grow into space the page does not need. */
    pageSpanPx?: number;
    isLeftSidebarOpen: boolean;
    isRightSidebarOpen: boolean;
};

export const buildEditorRootStyle = ({
    persistentCharacters,
    editorStyle,
    sidebarWidth,
    pageSpanPx,
    isLeftSidebarOpen,
    isRightSidebarOpen,
}: BuildEditorRootStyleArgs): CSSProperties => {
    const baseSidebarWidth = sidebarWidth ?? 'var(--sidebar-width)';

    /*
     * Sidebars widen only into space left over once the page and its canvas
     * padding fit at full size beside two sidebars, so growing them never
     * shrinks the paper. Below that they stay at the base width.
     */
    const editorSidebarWidth =
        pageSpanPx === undefined
            ? baseSidebarWidth
            : `clamp(${baseSidebarWidth}, calc((100vw - ${Math.ceil(pageSpanPx)}px - 2 * var(--space-3xl)) / 2), var(--sidebar-max-width))`;

    return {
        ...persistentCharacters.reduce<Record<string, string>>((variables, character) => {
            const normalizedColor = normalizeCharacterColorHex(character.colorHex);

            if (!normalizedColor) {
                return variables;
            }

            variables[getCharacterColorVarName(character.key)] = normalizedColor;

            return variables;
        }, {}),
        ...editorStyle,
        '--editor-sidebar-width': editorSidebarWidth,
        '--left-sidebar-size': isLeftSidebarOpen ? 'var(--editor-sidebar-width)' : '0px',
        '--right-sidebar-size': isRightSidebarOpen ? 'var(--editor-sidebar-width)' : '0px',
    } as CSSProperties;
};
