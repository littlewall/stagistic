import {DEFAULT_EDITOR_SETTINGS} from '@stagistic/script';
import {createRoot, type Root} from 'react-dom/client';
import {
    MemoryRouter,
    Route,
    Routes,
    useLocation,
} from 'react-router-dom';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {ScriptEditorAppHeader} from '../../layout/AppHeader';
import {CharacterFilterModule} from './export/modules/CharacterFilterModule';
import {useExportScriptData} from './export/useExportScriptData';

vi.mock('@stagistic/app-core', async importOriginal => {
    const original = await importOriginal<typeof import('@stagistic/app-core')>();

    return {
        ...original,
        useScriptPlaces: () => ({places: [], scenePlaceIds: {}}),
        useScriptRepository: () => ({}),
    };
});

vi.mock('./ScriptWorkspaceContext', () => ({
    useScriptWorkspace: () => ({
        currentScript: {id: 's1', name: 'My Script'},
        currentScriptId: 's1',
        characterCatalog: {
            characters: [{id: 'anna', kind: 'character', key: 'ANNA', outline: null}],
            groups: [{id: 'all', kind: 'group', key: 'ALL', memberIds: ['anna']}],
        },
        initialValue: {type: 'doc', content: []},
        initialIndexSnapshot: {
            blocks: [
                {
                    blockId: 'anna-cue',
                    orderNo: 0,
                    blockType: 'character',
                    textContent: 'ANNA',
                    actBlockId: null,
                    sceneBlockId: null,
                    characterRefs: [{key: 'ANNA', characterId: 'anna'}],
                },
                {
                    blockId: 'all-cue',
                    orderNo: 1,
                    blockType: 'character',
                    textContent: 'ALL',
                    actBlockId: null,
                    sceneBlockId: null,
                    characterRefs: [{key: 'ALL', characterId: 'all'}],
                },
            ],
            music: [],
            orphanMusicOutBlockIds: [],
        },
    }),
}));

vi.mock('./ScriptCharactersContext', () => ({
    useScriptCharacters: () => ({
        confirmedCharacterRecords: [
            {id: 'anna', kind: 'character', key: 'ANNA', outline: null},
        ],
        confirmedGroupRecords: [
            {id: 'all', kind: 'group', key: 'ALL', memberIds: ['anna']},
        ],
    }),
}));

vi.mock('./settings/ScriptSettingsModalProvider', () => ({
    useScriptSettingsModal: () => ({
        resolvedScriptSettings: DEFAULT_EDITOR_SETTINGS,
        titlePageDraft: null,
    }),
}));

const mountedRoots: Root[] = [];

const LocationProbe = () => {
    const location = useLocation();

    return <div data-testid="pathname">{location.pathname}</div>;
};

const renderAt = (view: 'editor' | 'export') => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <MemoryRouter initialEntries={[`/script/s1/${view}`]}>
            <ScriptEditorAppHeader
                currentScript={{id: 's1', name: 'My Script'}}
                activeView={view}
            />
            <Routes>
                <Route path="/script/:scriptId/editor" element={<LocationProbe />} />
                <Route path="/script/:scriptId/export" element={<LocationProbe />} />
            </Routes>
        </MemoryRouter>,
    );
    mountedRoots.push(root);
};

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for condition');
};

const pathname = () => document.querySelector('[data-testid="pathname"]')?.textContent ?? '';

const ExportCharacterFilterProbe = () => {
    const {script} = useExportScriptData();

    return (
        <CharacterFilterModule
            value={{mode: 'only', characterIds: []}}
            characters={script?.characters ?? []}
            onChange={() => undefined}
        />
    );
};

const findSegment = (label: string): HTMLElement => {
    const button = Array.from(document.querySelectorAll('button'))
        .find(el => el.textContent?.trim() === label);

    if (!button) {
        throw new Error(`Segment "${label}" not found`);
    }

    return button as HTMLElement;
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('view switcher navigation', () => {
    it('navigates to export when the Export segment is pressed', async () => {
        renderAt('editor');
        await waitFor(() => pathname() === '/script/s1/editor');

        expect(pathname()).toBe('/script/s1/editor');
        expect(findSegment('Export').getAttribute('aria-pressed')).toBe('false');

        await userEvent.click(findSegment('Export'));
        await waitFor(() => pathname() === '/script/s1/export');

        expect(pathname()).toBe('/script/s1/export');
    });

    it('navigates back to editor from the export view', async () => {
        renderAt('export');
        await waitFor(() => pathname() === '/script/s1/export');

        expect(pathname()).toBe('/script/s1/export');
        expect(findSegment('Export').getAttribute('aria-pressed')).toBe('true');

        await userEvent.click(findSegment('Editor'));
        await waitFor(() => pathname() === '/script/s1/editor');

        expect(pathname()).toBe('/script/s1/editor');
    });
});

describe('export character filter', () => {
    it('renders exact-kind character catalog rows only', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        root.render(<ExportCharacterFilterProbe />);
        mountedRoots.push(root);
        await waitFor(() => document.querySelectorAll('input[type="checkbox"]').length > 0);

        const labels = Array.from(document.querySelectorAll('label'))
            .map(label => label.textContent?.trim());

        expect(labels).toContain('Anna');
        expect(labels).not.toContain('All');
    });
});
