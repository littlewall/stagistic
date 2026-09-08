import {createRoot, type Root} from 'react-dom/client';
import {vi} from 'vite-plus/test';

import {
    type AttributeManagerCharacter,
    type AttributeManagerCharacterWorkspaceId,
    AttributeManagerCharactersPanel,
    type AttributeManagerGroup,
} from './AttributeManagerCharactersPanel';

export const mountedRoots: Root[] = [];

export const CHARACTERS = [
    {
        id: 'char-1',
        name: 'ANNA',
        color: '#8899aa',
        outline: 'existing outline',
    }, {
        id: 'char-2',
        name: 'BORIS',
        color: '#aa9988',
        outline: 'selected outline',
    },
];

export const GROUPS: AttributeManagerGroup[] = [
    {
        id: 'group-1',
        name: 'ALL',
        color: '#778899',
        memberIds: [],
        usageCount: 2,
    }, {
        id: 'group-2',
        name: 'ENSEMBLE',
        color: null,
        memberIds: ['char-1'],
        usageCount: 0,
    },
];

export const waitForElement = async <T extends Element>(selector: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = document.querySelector<T>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Expected element matching ${selector}`);
};

export const findButtonByText = (label: string): HTMLButtonElement => {
    const button = Array.from(document.querySelectorAll('button'))
        .find(candidate => candidate.textContent?.trim() === label);

    if (!button) {
        throw new Error(`Expected a button labelled ${label}`);
    }

    return button;
};

export const waitForVisibleElement = async <T extends Element>(selector: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = Array.from(document.querySelectorAll<T>(selector))
            .find(candidate => candidate.getClientRects().length > 0);

        if (element) {
            return element;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Expected a visible element matching ${selector}`);
};

export const findVisibleButtonByText = (label: string): HTMLButtonElement => {
    const button = Array.from(document.querySelectorAll('button'))
        .find(candidate => candidate.textContent?.trim() === label && candidate.getClientRects().length > 0);

    if (!button) {
        throw new Error(`Expected a visible button labelled ${label}`);
    }

    return button;
};

export const renderPanel = (
    initialSelectedCharacterId?: string,
    onSetCharacterColor: (
        characterId: string,
        colorHex: string | null,
    ) => void | Promise<unknown> = vi.fn(),
    characters: AttributeManagerCharacter[] = CHARACTERS,
    initialWorkspaceId?: AttributeManagerCharacterWorkspaceId,
    initialSelectedGroupId?: string,
    groups: AttributeManagerGroup[] = [],
): {
    onSetCharacterColor: (characterId: string, colorHex: string | null) => unknown,
    onSetCharacterOutline: (characterId: string, outline: string | null) => unknown,
    onDeleteCharacter: (characterId: string) => unknown,
    onCreateCharacter: (characterName: string) => unknown,
} => {
    const host = document.createElement('div');
    const onSetCharacterOutline = vi.fn();
    const onDeleteCharacter = vi.fn();
    const onCreateCharacter = vi.fn();

    host.style.width = '900px';
    host.style.height = '600px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <AttributeManagerCharactersPanel
            characters={characters}
            groups={groups}
            initialSelectedCharacterId={initialSelectedCharacterId}
            initialWorkspaceId={initialWorkspaceId}
            initialSelectedGroupId={initialSelectedGroupId}
            onSetCharacterColor={onSetCharacterColor}
            onSetCharacterOutline={onSetCharacterOutline}
            onDeleteCharacter={onDeleteCharacter}
            onCreateCharacter={onCreateCharacter}
        />,
    );
    mountedRoots.push(root);

    return {
        onSetCharacterColor,
        onSetCharacterOutline,
        onDeleteCharacter,
        onCreateCharacter,
    };
};

export const cleanupPanels = () => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
};
