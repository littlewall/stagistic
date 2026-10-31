import '@stagistic/ui/styles/base.css';

import {isApplePlatform, requireValue} from '@stagistic/shared';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {
    cardOf,
    createScript,
    findButton,
    mountApp,
    mountedRoots,
    repository,
    sceneHeadings,
    waitFor,
} from './boardTestFixtures';

const dialogButton = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('dialog[open] button')].find(button => button.textContent?.trim() === label);

describe('Board structure editing', () => {
    it('cancels a new scene and returns focus to its insertion point', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);

        const add = requireValue(findButton('Add scene before scene 2'));

        await userEvent.click(add);
        await userEvent.type(await waitFor(() => document.querySelector<HTMLInputElement>('input[aria-label="Scene name"]')), 'Draft{Escape}');
        await waitFor(() => document.activeElement === add, 3000);
        expect(sceneHeadings()).toHaveLength(3);
    });

    it('undoes Board and earlier Editor changes in the same history', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/editor`);

        const editor = await waitFor(() => document.querySelector<HTMLElement>('[data-editor-ready="true"] [data-editor="true"]'));
        const line = requireValue(editor.querySelector<HTMLElement>('[data-id="d3"]'));

        await userEvent.click(line);
        window.getSelection()?.selectAllChildren(line);
        window.getSelection()?.collapseToEnd();
        await userEvent.keyboard(' EXTRA');
        await userEvent.click(requireValue(findButton('Board')));
        await waitFor(() => sceneHeadings().length === 3);
        await userEvent.click(requireValue(findButton('Rename scene 2')));

        const input = await waitFor(() => document.querySelector<HTMLElement>('[role="textbox"][aria-label="Rename scene 2"]'));

        await userEvent.clear(input);
        await userEvent.type(input, 'Board name{Enter}');
        await waitFor(() => sceneHeadings()[1]?.includes('Board name'));

        const undo = isApplePlatform() ? '{Meta>}z{/Meta}' : '{Control>}z{/Control}';

        await userEvent.keyboard(undo);
        await waitFor(() => sceneHeadings()[1]?.includes('Garden'));
        await userEvent.keyboard(undo);
        await userEvent.click(requireValue(findButton('Editor')));

        const reopened = await waitFor(() => document.querySelector<HTMLElement>('[data-editor-ready="true"] [data-editor="true"]'));

        expect(reopened.querySelector('[data-id="d3"]')?.textContent).toBe('Mind the edge.');
    });

    it('saves a Board edit before a reload', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);
        await userEvent.click(requireValue(findButton('Add scene before scene 2')));
        await userEvent.type(await waitFor(() => document.querySelector<HTMLInputElement>('input[aria-label="Scene name"]')), 'Persisted scene{Enter}');
        await waitFor(() => sceneHeadings().length === 4);

        const deadline = Date.now() + 10000;
        let persisted = false;

        while (!persisted && Date.now() < deadline) {
            const value = await repository.loadLatest(scriptId);

            persisted = value?.content.some(block => block.content?.some(node => node.text === 'Persisted scene')) ?? false;

            if (!persisted) await new Promise(resolve => setTimeout(resolve, 25));
        }

        expect(persisted).toBe(true);
        mountedRoots.pop()?.unmount();
        document.body.innerHTML = '';
        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 4);
        expect(sceneHeadings()[1]).toContain('Persisted scene');
    });

    it('moves a scene to an empty act with the keyboard', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);
        await userEvent.click(requireValue(findButton('Add act at the end')));
        await waitFor(() => document.querySelector('section[aria-label="ACT 3"]'));
        cardOf('3. Roof').focus();
        await userEvent.keyboard('{Space}{ArrowDown}{Space}');
        await waitFor(() => document.querySelector('section[aria-label="ACT 3"]')?.textContent?.includes('Roof'), 4000);
        expect(document.querySelector('section[aria-label="ACT TWO"]')?.textContent).not.toContain('Roof');
    });

    it('moves a scene into another act with the keyboard', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);
        cardOf('2. Garden').focus();
        await userEvent.keyboard('{Space}{ArrowDown}{Space}');
        await waitFor(() => {
            const secondAct = document.querySelector<HTMLElement>('section[aria-label="ACT TWO"]');

            return secondAct?.textContent?.includes('Garden');
        }, 4000);
        expect(document.querySelector('section[aria-label="ACT ONE"]')?.textContent).not.toContain('Garden');
    });

    it('moves a complete scene with the keyboard and undoes it on the Board', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);

        cardOf('2. Garden').focus();
        await userEvent.keyboard('{Space}{ArrowLeft}{Space}');
        await waitFor(() => sceneHeadings().length === 3 && sceneHeadings()[0]?.includes('Garden') && sceneHeadings()[1]?.includes('Kitchen, night'));
        expect(sceneHeadings()[1]).toContain('Kitchen, night');
        await userEvent.keyboard(isApplePlatform() ? '{Meta>}z{/Meta}' : '{Control>}z{/Control}');
        await waitFor(() => sceneHeadings()[0]?.includes('Kitchen, night'));
    });

    it('puts Add act where a deleted first act was named', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);

        const middle = (element: Element) => element.getBoundingClientRect().top + element.getBoundingClientRect().height / 2;
        const nameMiddle = middle(requireValue(document.querySelector('section h2')));

        await userEvent.click(requireValue(findButton('Act ACT ONE actions')));
        await userEvent.click(requireValue([...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(item => item.textContent === 'Delete act')));
        await userEvent.click(await waitFor(() => dialogButton('Delete act')));

        const addAct = await waitFor(() => findButton('Add act at the start'));

        expect(middle(addAct)).toBeCloseTo(nameMiddle, 0);
        expect(sceneHeadings()).toHaveLength(3);
        await userEvent.click(addAct);
        await waitFor(() => document.activeElement?.getAttribute('role') === 'textbox');
        expect(document.activeElement?.closest('section')?.textContent).toContain('Kitchen, night');
    });

    it('makes room for a dragged scene where it would land and restores the order on cancel', async () => {
        const {scriptId} = await createScript();
        const firstAct = () => [...document.querySelectorAll('section[aria-label="ACT ONE"] h3')].map(heading => heading.textContent);

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);
        cardOf('1. Kitchen, night').focus();
        await userEvent.keyboard('{Space}{ArrowRight}');
        // The other cards move aside while dragging; only the placeholder marks the landing place.
        await waitFor(() => firstAct()[0] === '2. Garden', 4000);
        expect(document.querySelector('section[aria-label="ACT ONE"] li[data-dnd-placeholder]')).not.toBeNull();
        expect(findButton('Add scene before scene 2')).toBeUndefined();
        await userEvent.keyboard('{Escape}');
        await waitFor(() => firstAct()[0] === '1. Kitchen, night', 4000);
        expect(findButton('Add scene before scene 2')).toBeDefined();
    });

    it('deletes an act with its menu and the scene in it lands in the previous act', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);
        await userEvent.click(requireValue(findButton('Add act at the end')));
        await waitFor(() => document.querySelector('section[aria-label="ACT 3"]'));
        cardOf('3. Roof').focus();
        await userEvent.keyboard('{Space}{ArrowDown}{Space}');
        await waitFor(() => document.querySelector('section[aria-label="ACT 3"]')?.textContent?.includes('Roof'), 4000);

        // Deleting the act removes only its heading: the scene stays, in the previous act.
        await userEvent.click(requireValue(findButton('Act ACT 3 actions')));
        await userEvent.click(requireValue([...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(item => item.textContent === 'Delete act')));
        await userEvent.click(await waitFor(() => dialogButton('Delete act')));
        await waitFor(() => document.querySelectorAll('section').length === 2);
        expect(sceneHeadings()).toHaveLength(3);
        expect(document.querySelector('section[aria-label="ACT TWO"]')?.textContent).toContain('Roof');
    });

    it('keeps a newly inserted scene expanded and focused while a character filter is active', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);
        await userEvent.click(requireValue(findButton('Characters')));
        await waitFor(() => document.querySelector('[role="dialog"]'));
        await userEvent.click(requireValue([...document.querySelectorAll<HTMLElement>('[role="dialog"] li label')].find(label => label.textContent?.startsWith('BEN'))));
        await userEvent.keyboard('{Escape}');
        await userEvent.click(requireValue(findButton('Add scene before scene 2')));
        await userEvent.type(await waitFor(() => document.querySelector<HTMLInputElement>('input[aria-label="Scene name"]')), 'Filtered scene{Enter}');
        await waitFor(() => sceneHeadings().length === 4);

        const card = cardOf('2. Filtered scene');

        expect(card.getAttribute('data-collapsed')).toBeNull();
        await waitFor(() => document.activeElement?.getAttribute('aria-label') === 'Rename scene 2');
    });

    it('inserts and renames a scene from the Board before opening the Editor', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);
        expect(findButton('Add scene before scene 2')).toBeDefined();
        await userEvent.click(requireValue(findButton('Add scene before scene 2')));

        const input = await waitFor(() => document.querySelector<HTMLInputElement>('input[aria-label="Scene name"]'));

        await userEvent.type(input, 'New scene{Enter}');
        await waitFor(() => sceneHeadings().length === 4);
        expect(sceneHeadings()[1]).toContain('New scene');
        // Shown in the script's scene casing (uppercase by default) while stored as typed. No cast yet, but the card offers its outline and adding a character.
        expect(getComputedStyle(requireValue(cardOf('2. New scene').querySelector('[data-board-name]'))).textTransform).toBe('uppercase');

        const body = requireValue(cardOf('2. New scene').querySelector('[class*="body"]'));

        expect(body.querySelector('[aria-label^="Characters"]')).toBeNull();
        expect(body.querySelector('[aria-label="Character notes"]')).toBeNull();
        expect(body.querySelector('[aria-label="Outline of scene 2"]')?.getAttribute('data-placeholder')).toBe('Add scene outline');
        expect(body.querySelector('[aria-label="Add character to scene 2"]')).not.toBeNull();
        await userEvent.click(requireValue(findButton('Rename scene 2')));

        const heading = await waitFor(() => document.querySelector<HTMLElement>('[role="textbox"][aria-label="Rename scene 2"]'));

        await userEvent.clear(heading);
        await userEvent.type(heading, 'Revised scene{Enter}');
        await waitFor(() => sceneHeadings()[1]?.includes('Revised scene'));
        await userEvent.click(requireValue(findButton('Editor')));
        await waitFor(() => document.querySelector('[data-editor-ready="true"]'));
        expect(document.querySelector('[data-editor="true"]')?.textContent).toContain('Revised scene');
    });
});
