import '@stagistic/ui/styles/base.css';

import {createScriptSnapshotFromCurrent} from '@stagistic/app-core';
import {isApplePlatform, requireValue} from '@stagistic/shared';
import {StrictMode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter, useLocation} from 'react-router-dom';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page, userEvent} from 'vite-plus/test/browser';

import {storeCurrentPublicPreviewAcknowledgement} from './publicPreview/publicPreviewAcknowledgement';
import type {ScriptRepository} from './repo';

const BOARD_PREFERENCES_KEY = 'stagistic.board.preferences';
const mountedRoots: Root[] = [];
const createdScriptIds: string[] = [];
let repository: ScriptRepository;

type ScriptDocument = NonNullable<Parameters<ScriptRepository['createScript']>[1]>;
type ScriptNode = ScriptDocument['content'][number];

const block = (type: string, id: string, text: string, attrs: Record<string, unknown> = {}): ScriptNode => ({
    type,
    attrs: {id, ...attrs},
    content: text ? [{type: 'text', text}] : [],
});

interface CreatedScript {
    scriptId: string,
    annaId: string,
    benId: string,
}

/* Two acts, three scenes. ANNA and BEN are confirmed characters; DOCTOR is not. */
const createScript = async (): Promise<CreatedScript> => {
    const annaId = repository.allocateScriptCharacterId();
    const benId = repository.allocateScriptCharacterId();
    const document: ScriptDocument = {
        type: 'doc',
        content: [
            block('act', 'a1', 'ACT ONE'),
            block('scene', 's1', 'Kitchen, night'),
            block('character', 'c1', 'ANNA', {characterRefs: {ANNA: annaId}}),
            block('dialogue', 'd1', 'Is anyone there?'),
            block('scene', 's2', 'Garden'),
            block('character', 'c2', 'BEN', {characterRefs: {BEN: benId}}),
            block('dialogue', 'd2', 'Only me.'),
            block('act', 'a2', 'ACT TWO'),
            block('scene', 's3', 'Roof'),
            block('character', 'c3', 'ANNA / DOCTOR', {characterRefs: {ANNA: annaId}}),
            block('dialogue', 'd3', 'Mind the edge.'),
        ],
    };
    const scriptId = await repository.createScript('Board test', {type: 'doc', content: document.content.map(({attrs, ...node}) => ({...node, attrs: {id: attrs?.id}}))});

    createdScriptIds.push(scriptId);
    await repository.confirmScriptCharacterWithId(scriptId, {
        id: annaId,
        key: 'ANNA',
        colorHex: '#cc3344',
    });
    await repository.confirmScriptCharacterWithId(scriptId, {
        id: benId,
        key: 'BEN',
        colorHex: '#2266cc',
    });
    // Linked only now: a reference to a character the script does not know yet is rejected.
    await repository.saveLatest(scriptId, document);

    return {
        scriptId,
        annaId,
        benId,
    };
};

const LocationProbe = () => {
    const location = useLocation();

    return <output data-testid="location">{`${location.pathname}|${JSON.stringify(location.state)}`}</output>;
};

const mountApp = async (path: string) => {
    const {default: App} = await import('./App');
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(
        <StrictMode>
            <MemoryRouter initialEntries={[path]}>
                <App />
                <LocationProbe />
            </MemoryRouter>
        </StrictMode>,
    );
    mountedRoots.push(root);
};

const waitFor = async <T,>(read: () => T | null | undefined | false, timeoutMs = 20_000): Promise<T> => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const value = read();

        if (value) {
            return value;
        }

        await new Promise(resolve => window.setTimeout(resolve, 25));
    }

    throw new Error('Timed out waiting for condition');
};

const sceneHeadings = () => [...document.querySelectorAll('section h3')].map(heading => heading.textContent);
const actTitles = () => [...document.querySelectorAll('section h2')].map(heading => heading.textContent);
const locationText = () => document.querySelector('[data-testid="location"]')?.textContent ?? '';
const findButton = (label: string) => [...document.querySelectorAll<HTMLElement>('button')].find(
    button => button.getAttribute('aria-label') === label || button.textContent?.trim() === label,
);
const cardOf = (headingText: string) => requireValue(
    [...document.querySelectorAll<HTMLElement>('section li')].find(card => card.querySelector('h3')?.textContent === headingText),
    headingText,
);

const openSceneMenu = async (sceneNumber: number) => {
    await userEvent.click(requireValue(await waitFor(() => findButton(`Scene ${sceneNumber} actions`))));
    await waitFor(() => document.querySelector('[role="menu"]'));
};

const menuLabels = () => [...document.querySelectorAll('[role="menuitem"]')].map(item => item.textContent);

beforeEach(async () => {
    storeCurrentPublicPreviewAcknowledgement();
    await page.viewport(1280, 800);
    ({scriptRepository: repository} = await import('./repo'));
});

afterEach(async () => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
    window.localStorage.removeItem(BOARD_PREFERENCES_KEY);

    for (const scriptId of createdScriptIds.splice(0)) {
        window.localStorage.removeItem(`${BOARD_PREFERENCES_KEY}:script:${scriptId}`);
        await repository.deleteScript(scriptId);
    }

    vi.unstubAllGlobals();
});

describe('Board view', () => {
    it('opens first by direct URL, showing acts, scenes, characters and unknown pages', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board`);
        await waitFor(() => sceneHeadings().length === 3);

        expect(locationText()).toContain(`/script/${scriptId}/board/wall`);
        expect(actTitles()).toEqual(['ACT ONE', 'ACT TWO']);
        expect(sceneHeadings()).toEqual([
            '1. Kitchen, night',
            '2. Garden',
            '3. Roof',
        ]);
        expect(cardOf('1. Kitchen, night').textContent).toContain('–');
        expect(cardOf('1. Kitchen, night').textContent).not.toContain('p. ');
        expect(cardOf('3. Roof').querySelector('[aria-label^="Characters"]')?.getAttribute('aria-label')).toBe('Characters: ANNA, DOCTOR');
        expect(findButton('Board')?.getAttribute('aria-pressed')).toBe('true');
        expect(document.querySelector('[data-editor-ready]')).toBeNull();
    });

    it('falls back to the Wall for an unknown lens', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/unknown`);
        await waitFor(() => sceneHeadings().length === 3);

        expect(locationText()).toContain(`/script/${scriptId}/board/wall`);
    });

    it('collapses scenes without the filtered character and dims the others', async () => {
        const {scriptId, annaId} = await createScript();

        window.localStorage.setItem(`${BOARD_PREFERENCES_KEY}:script:${scriptId}`, JSON.stringify({characterIds: [annaId, 'gone-character']}));
        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);

        expect(cardOf('2. Garden').querySelector('[aria-label^="Characters"]')).toBeNull();
        expect(cardOf('2. Garden').getBoundingClientRect().height).toBeLessThan(cardOf('1. Kitchen, night').getBoundingClientRect().height);
        expect(cardOf('1. Kitchen, night').querySelector('[aria-label^="Characters"]')).not.toBeNull();
        expect(document.body.textContent).toContain('ANNA');
    });
});

describe('Board toolbar', () => {
    it('filters from the Characters panel, clears with the cross, and hides cast with View', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);

        const hasChips = (heading: string) => cardOf(heading).querySelector('[aria-label^="Characters"]') !== null;

        expect(findButton('Wall')?.getAttribute('aria-current')).toBe('page');

        await userEvent.click(requireValue(findButton('Characters')));
        await waitFor(() => document.querySelector('[role="dialog"]'));
        await userEvent.click(requireValue([...document.querySelectorAll<HTMLElement>('[role="dialog"] li label')].find(label => label.textContent?.startsWith('BEN'))));
        await waitFor(() => findButton('Clear character filter'));

        expect(findButton('Characters: BEN')).toBeDefined();
        expect(hasChips('1. Kitchen, night')).toBe(false);
        expect(hasChips('2. Garden')).toBe(true);

        await userEvent.keyboard('{Escape}');
        await waitFor(() => document.querySelector('[role="dialog"]') === null);
        await userEvent.click(requireValue(findButton('Clear character filter')));
        await waitFor(() => hasChips('1. Kitchen, night'));

        expect(findButton('Clear character filter')).toBeUndefined();

        await userEvent.click(requireValue(findButton('View')));
        await userEvent.click(requireValue([...document.querySelectorAll<HTMLElement>('[role="dialog"] label')].find(label => label.textContent === 'Characters on stage')));
        await waitFor(() => !hasChips('1. Kitchen, night'));

        expect(hasChips('3. Roof')).toBe(false);
    });
});

describe('Board and Editor', () => {
    it('shows a scene and a character typed in the Editor, without waiting for a save', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/editor`);

        const editorElement = await waitFor(() => document.querySelector<HTMLElement>('[data-editor-ready="true"] [data-editor="true"]'));
        const cue = await waitFor(() => editorElement.querySelector<HTMLElement>('[data-id="c3"]'));
        const lastLine = await waitFor(() => editorElement.querySelector<HTMLElement>('[data-id="d3"]'));
        const sceneChord = isApplePlatform() ? '{Control>}1{/Control}' : '{Alt>}1{/Alt}';

        await userEvent.click(cue);
        window.getSelection()?.selectAllChildren(cue);
        window.getSelection()?.collapseToEnd();
        await userEvent.keyboard(' / BEN');
        await userEvent.click(lastLine);
        window.getSelection()?.selectAllChildren(lastLine);
        window.getSelection()?.collapseToEnd();
        await userEvent.keyboard('{Enter}');
        await userEvent.keyboard(sceneChord);
        await userEvent.keyboard('Cellar');
        await userEvent.click(requireValue(findButton('Board')));
        await waitFor(() => sceneHeadings().length === 4);

        expect(sceneHeadings()).toEqual([
            '1. Kitchen, night',
            '2. Garden',
            '3. Roof',
            '4. Cellar',
        ]);
        expect(cardOf('3. Roof').querySelector('[aria-label^="Characters"]')?.getAttribute('aria-label')).toBe('Characters: ANNA, DOCTOR, BEN');
        expect(cardOf('4. Cellar').textContent).toMatch(/p\. \d+/);
    });

    it('opens the Editor at the scene heading and consumes the request once', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);
        await openSceneMenu(3);

        expect(menuLabels()).toEqual(['Open in Editor', 'Delete scene…']);

        await userEvent.click(requireValue([...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(item => item.textContent === 'Open in Editor')));
        await waitFor(() => locationText().startsWith(`/script/${scriptId}/editor|`));
        await waitFor(() => document.querySelector('[data-editor-ready="true"]'));
        await waitFor(() => window.getSelection()?.anchorNode?.parentElement?.closest('[data-id]')?.getAttribute('data-id') === 's3');

        await waitFor(() => locationText() === `/script/${scriptId}/editor|null`);
        await page.viewport(1280, 800);

        expect(window.getSelection()?.anchorNode?.parentElement?.closest('[data-id]')?.getAttribute('data-id')).toBe('s3');
    });

    it('offers no scene deletion in a stored draft', async () => {
        const {scriptId} = await createScript();
        const snapshot = requireValue(await createScriptSnapshotFromCurrent({
            repository,
            scriptId,
            kind: 'draft',
        }));

        await mountApp(`/script/${scriptId}/snapshots/${snapshot.id}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);
        await openSceneMenu(2);

        expect(menuLabels()).toEqual(['Open in Editor']);
    });
});
