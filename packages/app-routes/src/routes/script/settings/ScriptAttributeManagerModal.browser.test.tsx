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

import {ATTRIBUTE_MANAGER_PANEL_MUSIC} from '../attributes/attributeManagerMenu';
import {ScriptAttributeManagerModal} from './ScriptAttributeManagerModal';

const roots: Root[] = [];

type DeletableAttributeManagerProps = ComponentProps<typeof ScriptAttributeManagerModal> & {
    onDeleteMusic?: (musicId: string) => Promise<void>,
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
            characterColorSaturation={50}
            sceneItems={[]}
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
