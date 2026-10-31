import '@stagistic/ui/styles/base.css';

import {createScriptSnapshotFromCurrent} from '@stagistic/app-core';
import {isApplePlatform, requireValue} from '@stagistic/shared';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {page, userEvent} from 'vite-plus/test/browser';

import {
    actTitles,
    BOARD_PREFERENCES_KEY,
    cardOf,
    createScript,
    findButton,
    locationText,
    menuLabels,
    mountApp,
    openSceneMenu,
    repository,
    sceneHeadings,
    waitFor,
} from './boardTestFixtures';

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
        expect(cardOf('1. Kitchen, night').textContent).not.toMatch(/p\. |–/);
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
        await userEvent.click(requireValue([...document.querySelectorAll<HTMLElement>('[role="dialog"] label')].find(label => label.textContent === 'Characters')));
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

        expect(menuLabels()).toEqual(['Open in Editor']);

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
