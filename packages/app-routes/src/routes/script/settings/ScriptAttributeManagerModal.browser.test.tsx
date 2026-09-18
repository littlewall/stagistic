import '@stagistic/ui/styles/base.css';

import type {
    ComponentProps,
    ComponentType,
} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {
    ATTRIBUTE_MANAGER_PANEL_CHARACTERS,
    ATTRIBUTE_MANAGER_PANEL_MUSIC,
    ATTRIBUTE_MANAGER_PANEL_STRUCTURE,
} from '../attributes/attributeManagerMenu';
import {ScriptAttributeManagerModal} from './ScriptAttributeManagerModal';

const roots: Root[] = [];

type DeletableAttributeManagerProps = ComponentProps<typeof ScriptAttributeManagerModal> & {
    onDeleteMusic?: (musicId: string) => Promise<void>,
    groupItems?: Array<{
        id: string,
        name: string,
        color: string | null,
        memberIds: string[],
        usageCount: number,
    }>,
};

const DeletableAttributeManager = ScriptAttributeManagerModal as ComponentType<DeletableAttributeManagerProps>;

const waitForElement = async <T extends Element>(selector: string): Promise<T> => {
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

const findButton = (label: string) => {
    return Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
        .find(button => button.textContent?.trim() === label) ?? null;
};

const findByText = (text: string) => {
    return Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
        .find(button => button.textContent?.includes(text)) ?? null;
};

const renderStructureManager = (
    deleteScene = vi.fn(() => Promise.resolve()),
    firstSceneHeadingBlockId: string | null = 's1',
) => {
    const host = document.createElement('div');
    const root = createRoot(host);
    const sceneItems = [
        {
            id: 's1', number: '1.', title: 'Opening',
        }, {
            id: 's2', number: '2.', title: 'Kitchen',
        },
    ];

    host.style.width = '1000px';
    host.style.height = '700px';
    document.body.appendChild(host);
    root.render(
        <DeletableAttributeManager
            currentScriptId="script-1"
            isOpen
            tabs={[{id: ATTRIBUTE_MANAGER_PANEL_STRUCTURE, label: 'Structure'}]}
            activePanelId={ATTRIBUTE_MANAGER_PANEL_STRUCTURE}
            selectedCharacterId={null}
            selectedMusicId={null}
            onClose={() => undefined}
            onSelectPanel={() => undefined}
            characters={{} as never}
            characterItems={[]}
            groupItems={[]}
            characterColorSaturation={50}
            sceneItems={sceneItems}
            firstSceneHeadingBlockId={firstSceneHeadingBlockId}
            onDeleteScene={deleteScene}
            placeState={{
                places: [],
                scenePlaceIds: {},
                setScenePlaces: vi.fn(),
            } as never}
            musicState={{music: []} as never}
            musicItems={[]}
            musicAttachmentsState={{} as never}
            setMusicTitleDraft={() => undefined}
            persistMusicTitleDraft={() => Promise.resolve()}
            onDeleteMusic={() => Promise.resolve()}
        />,
    );
    roots.push(root);

    return {deleteScene};
};

const renderMusicManager = (
    deleteMusic = vi.fn(() => Promise.resolve()),
) => {
    const host = document.createElement('div');
    const root = createRoot(host);
    const createMusic = vi.fn(() => Promise.resolve({
        id: 'music-2',
        title: 'Finale',
        kind: 'song' as const,
        assignmentLabel: null,
    }));
    const music = [
        {
            id: 'music-1',
            title: 'Overture',
            kind: 'instrumental' as const,
            assignmentLabel: 'Assigned',
        },
    ];

    host.style.width = '1000px';
    host.style.height = '700px';
    document.body.appendChild(host);
    root.render(
        <DeletableAttributeManager
            currentScriptId="script-1"
            isOpen
            tabs={[{id: ATTRIBUTE_MANAGER_PANEL_MUSIC, label: 'Music'}]}
            activePanelId={ATTRIBUTE_MANAGER_PANEL_MUSIC}
            selectedCharacterId={null}
            selectedMusicId={null}
            onClose={() => undefined}
            onSelectPanel={() => undefined}
            characters={{} as never}
            characterItems={[]}
            groupItems={[]}
            characterColorSaturation={50}
            sceneItems={[]}
            firstSceneHeadingBlockId={null}
            onDeleteScene={() => Promise.resolve()}
            placeState={{} as never}
            musicState={{
                music,
                createMusic,
                updateMusic: vi.fn(),
            } as never}
            musicItems={[
                {
                    id: 'music-1',
                    number: '1.',
                    title: 'Overture',
                },
            ]}
            musicAttachmentsState={{
                integratedScoresByMusic: new Map(),
                uploadingMusicIds: new Set(),
                uploadIntegratedScore: vi.fn(),
                removeIntegratedScore: vi.fn(),
                getBlob: vi.fn(),
            } as never}
            setMusicTitleDraft={() => undefined}
            persistMusicTitleDraft={() => Promise.resolve()}
            onDeleteMusic={deleteMusic}
        />,
    );
    roots.push(root);

    return {
        createMusic,
        deleteMusic,
    };
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('ScriptAttributeManagerModal music actions', () => {
    it('creates music through the list add action', async () => {
        const {createMusic} = renderMusicManager();

        await page.elementLocator(
            await waitForElement<HTMLButtonElement>('[aria-label="Create music"]'),
        ).click();

        const titleInput = await waitForElement<HTMLInputElement>('#music-title');

        await page.elementLocator(titleInput).fill('Finale');
        await page.elementLocator(findButton('Add music')!).click();

        expect(createMusic).toHaveBeenCalledWith({
            title: 'Finale',
            kind: 'song',
        });
    });

    it('deletes music only after confirmation', async () => {
        const {deleteMusic} = renderMusicManager();
        const deleteButton = await waitForElement<HTMLButtonElement>('[aria-label="Delete Overture"]');

        await page.elementLocator(deleteButton).click();
        await waitForElement('dialog[aria-label="Delete music"]');

        expect(deleteMusic).not.toHaveBeenCalled();

        await page.elementLocator(findButton('Delete')!).click();

        expect(deleteMusic).toHaveBeenCalledWith('music-1');
    });

    it('keeps the confirmation open when deletion fails', async () => {
        const deleteMusic = vi.fn(() => Promise.reject(new Error('write failed')));

        renderMusicManager(deleteMusic);

        await page.elementLocator(
            await waitForElement<HTMLButtonElement>('[aria-label="Delete Overture"]'),
        ).click();
        await page.elementLocator(findButton('Delete')!).click();
        await new Promise(resolve => window.setTimeout(resolve, 20));

        expect(document.querySelector('dialog[aria-label="Delete music"]')).not.toBeNull();
    });
});

describe('ScriptAttributeManagerModal group actions', () => {
    it('forwards live group items, membership changes, and deletion', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);
        const handleReplaceGroupMembers = vi.fn(() => Promise.resolve());
        const handleDeleteGroup = vi.fn(() => Promise.resolve());

        host.style.width = '1000px';
        host.style.height = '700px';
        document.body.appendChild(host);
        root.render(
            <DeletableAttributeManager
                currentScriptId="script-1"
                isOpen
                tabs={[{id: ATTRIBUTE_MANAGER_PANEL_CHARACTERS, label: 'Characters'}]}
                activePanelId={ATTRIBUTE_MANAGER_PANEL_CHARACTERS}
                selectedCharacterId={null}
                selectedGroupId="group-1"
                selectedMusicId={null}
                initialWorkspaceId="groups"
                onClose={() => undefined}
                onSelectPanel={() => undefined}
                characters={{
                    isCharactersLoading: false,
                    deletingCharacterIds: [],
                    renamingCharacterIds: [],
                    colorUpdatingCharacterIds: [],
                    deletingGroupIds: [],
                    renamingGroupIds: [],
                    colorUpdatingGroupIds: [],
                    membershipUpdatingGroupIds: [],
                    handleReplaceGroupMembers,
                    handleDeleteGroup,
                } as never}
                characterItems={[
                    {
                        id: 'char-1',
                        name: 'ANNA',
                        color: null,
                        outline: null,
                        voiceType: null,
                        vocalRangeLow: null,
                        vocalRangeHigh: null,
                        groupNames: ['ALL'],
                    },
                ]}
                groupItems={[
                    {
                        id: 'group-1',
                        name: 'ALL',
                        color: null,
                        memberIds: [],
                        usageCount: 1,
                    },
                ]}
                characterColorSaturation={50}
                sceneItems={[]}
                firstSceneHeadingBlockId={null}
                onDeleteScene={() => Promise.resolve()}
                placeState={{} as never}
                musicState={{music: []} as never}
                musicItems={[]}
                musicAttachmentsState={{} as never}
                setMusicTitleDraft={() => undefined}
                persistMusicTitleDraft={() => Promise.resolve()}
                onDeleteMusic={() => Promise.resolve()}
            />,
        );
        roots.push(root);

        const memberInput = await waitForElement<HTMLInputElement>('[placeholder="Select members"]');

        await page.elementLocator(memberInput).click();

        const suggestion = await waitForElement<HTMLElement>('[data-testid="suggestions"] li');

        await page.elementLocator(suggestion).click();
        expect(handleReplaceGroupMembers).toHaveBeenCalledWith('group-1', ['char-1']);

        await page.elementLocator(await waitForElement('[aria-label="Remove ALL"]')).click();
        expect(document.body.textContent).toContain('become unconfirmed characters');

        await page.elementLocator(findButton('Remove')!).click();
        expect(handleDeleteGroup).toHaveBeenCalledWith('group-1');
    });
});

describe('ScriptAttributeManagerModal scene actions', () => {
    it('hides the delete action for the first scene heading', async () => {
        renderStructureManager();

        // The first scene is selected by default; it must never be deletable.
        await waitForElement('[aria-label="Scene detail"]');

        expect(document.querySelector('[aria-label="Delete scene heading"]')).toBeNull();
    });

    it('deletes a non-first scene only after confirmation', async () => {
        const {deleteScene} = renderStructureManager();

        await waitForElement('[aria-label="Scene list"]');
        await page.elementLocator(findByText('Kitchen')!).click();

        const deleteButton = await waitForElement<HTMLButtonElement>('[aria-label="Delete scene heading"]');

        await page.elementLocator(deleteButton).click();
        await waitForElement('dialog[aria-label="Delete scene heading"]');

        expect(deleteScene).not.toHaveBeenCalled();

        await page.elementLocator(findButton('Delete heading')!).click();

        expect(deleteScene).toHaveBeenCalledWith('s2');
    });

    it('keeps the confirmation open when deletion fails', async () => {
        const deleteScene = vi.fn(() => Promise.reject(new Error('write failed')));

        renderStructureManager(deleteScene);

        await waitForElement('[aria-label="Scene list"]');
        await page.elementLocator(findByText('Kitchen')!).click();
        await page.elementLocator(
            await waitForElement<HTMLButtonElement>('[aria-label="Delete scene heading"]'),
        ).click();
        await page.elementLocator(findButton('Delete heading')!).click();
        await new Promise(resolve => window.setTimeout(resolve, 20));

        expect(document.querySelector('dialog[aria-label="Delete scene heading"]')).not.toBeNull();
    });
});
