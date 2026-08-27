import type {CSSProperties} from 'react';

import {
    getCharacterColorVarName,
    normalizeCharacterColorHex,
} from './characters/characterColors';
import type {PersistentCharacterRef} from './contracts';

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
        '--editor-sidebar-width': sidebarWidth ?? 'var(--sidebar-width)',
        '--left-sidebar-size': isLeftSidebarOpen ? 'var(--editor-sidebar-width)' : '0px',
        '--right-sidebar-size': isRightSidebarOpen ? 'var(--editor-sidebar-width)' : '0px',
    } as CSSProperties;
};
