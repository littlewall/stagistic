import type {CSSProperties} from 'react';

import {
    getCharacterColorVarName,
    normalizeCharacterColorHex,
} from './characterColors';
import type {PersistentCharacterRef} from './types';

type BuildEditorRootStyleArgs = {
    persistentCharacters: readonly PersistentCharacterRef[],
    editorStyle: CSSProperties,
    sidebarWidth?: string,
    isLeftSidebarOpen: boolean,
    isRightSidebarOpen: boolean,
};

export const buildEditorRootStyle = ({
    persistentCharacters,
    editorStyle,
    sidebarWidth,
    isLeftSidebarOpen,
    isRightSidebarOpen,
}: BuildEditorRootStyleArgs): CSSProperties => {
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
        '--editor-sidebar-width': sidebarWidth ?? 'calc(280px * var(--size-scale))',
        '--toolbar-toggle-width': 'calc(calc(26px * var(--size-scale)) + (var(--space-3) * 2))',
        '--left-toolbar-size': isLeftSidebarOpen ? 'var(--editor-sidebar-width)' : 'var(--toolbar-toggle-width)',
        '--right-toolbar-size': isRightSidebarOpen ? 'var(--editor-sidebar-width)' : 'var(--toolbar-toggle-width)',
        '--left-toolbar-divider-opacity': isLeftSidebarOpen ? '1' : '0',
        '--right-toolbar-divider-opacity': isRightSidebarOpen ? '1' : '0',
        '--left-sidebar-size': isLeftSidebarOpen ? 'var(--editor-sidebar-width)' : 'var(--toolbar-toggle-width)',
        '--right-sidebar-size': isRightSidebarOpen ? 'var(--editor-sidebar-width)' : 'var(--toolbar-toggle-width)',
    } as CSSProperties;
};
