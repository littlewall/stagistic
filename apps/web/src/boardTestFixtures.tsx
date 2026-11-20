import '@stagistic/ui/styles/base.css';

import {storeLastSeenRelease} from '@stagistic/app-routes';
import {currentReleaseNumber} from '@stagistic/release-notes/bundled';
import {requireValue} from '@stagistic/shared';
import {StrictMode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MemoryRouter, useLocation} from 'react-router-dom';
import {
    afterEach,
    beforeEach,
    vi,
} from 'vite-plus/test';
import {page, userEvent} from 'vite-plus/test/browser';

import {storeCurrentBrowserNoticeAcknowledgement} from './browserNotice/browserNoticeAcknowledgement';
import type {ScriptRepository} from './repo';

export const BOARD_PREFERENCES_KEY = 'stagistic.board.preferences';
export const mountedRoots: Root[] = [];

const createdScriptIds: string[] = [];

export let repository: ScriptRepository;

export type ScriptDocument = NonNullable<Parameters<ScriptRepository['createScript']>[1]>;
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

/*
 * Every script a test creates goes through here, so it is deleted after the test.
 * Block ids are unique across scripts and these fixtures reuse short ones: a script
 * left behind would take over the blocks of the next script with the same ids.
 */
export const createTrackedScript = async (title: string, document: ScriptDocument) => {
    const scriptId = await repository.createScript(title, document);

    createdScriptIds.push(scriptId);

    return scriptId;
};

/* Two acts, three scenes. ANNA and BEN are confirmed characters; DOCTOR is not. */
export const createScript = async (): Promise<CreatedScript> => {
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
    const scriptId = await createTrackedScript('Board test', {type: 'doc', content: document.content.map(({attrs, ...node}) => ({...node, attrs: {id: attrs?.id}}))});

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

export const mountApp = async (path: string) => {
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

export const waitFor = async <T,>(read: () => T | null | undefined | false, timeoutMs = 20_000): Promise<T> => {
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

export const sceneHeadings = () => [...document.querySelectorAll('section h3')].map(heading => heading.textContent);
export const actTitles = () => [...document.querySelectorAll('section h2')].map(heading => heading.textContent);
export const locationText = () => document.querySelector('[data-testid="location"]')?.textContent ?? '';
export const findButton = (label: string) => [...document.querySelectorAll<HTMLElement>('button, [role="button"]')].find(
    button => button.getAttribute('aria-label') === label || button.textContent?.trim() === label,
);
export const cardOf = (headingText: string) => requireValue(
    [...document.querySelectorAll<HTMLElement>('section li')].find(card => card.querySelector('h3')?.textContent === headingText),
    headingText,
);

/* dnd-kit makes a card focusable only once its sortable has registered, a moment after it renders. */
export const focusCard = (headingText: string) => waitFor(() => {
    const card = cardOf(headingText);

    card.focus();

    return document.activeElement === card;
});

export const openSceneMenu = async (sceneNumber: number) => {
    await userEvent.click(requireValue(await waitFor(() => findButton(`Scene ${sceneNumber} actions`))));
    await waitFor(() => document.querySelector('[role="menu"]'));
};

export const menuLabels = () => [...document.querySelectorAll('[role="menuitem"]')].map(item => item.textContent);

beforeEach(async () => {
    storeCurrentBrowserNoticeAcknowledgement();
    // A Release announcement would open over the script list; these tests are not about it.
    storeLastSeenRelease(currentReleaseNumber);
    await page.viewport(1280, 800);
    ({scriptRepository: repository} = await import('./repo'));
});

afterEach(async () => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
    window.localStorage.removeItem(BOARD_PREFERENCES_KEY);
    window.localStorage.removeItem('stagistic.lastSeenRelease');

    for (const scriptId of createdScriptIds.splice(0)) {
        window.localStorage.removeItem(`${BOARD_PREFERENCES_KEY}:script:${scriptId}`);
        await repository.deleteScript(scriptId);
    }

    vi.unstubAllGlobals();
});

