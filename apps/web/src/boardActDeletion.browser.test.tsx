import '@stagistic/ui/styles/base.css';

import {isApplePlatform, requireValue} from '@stagistic/shared';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {
    createScript,
    findButton,
    mountApp,
    sceneHeadings,
    waitFor,
} from './boardTestFixtures';

const deleteActMenuItem = () => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(item => item.textContent === 'Delete act');
// The confirmation is a native <dialog>, not a RAC popover: it carries no role attribute.
const dialogButton = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('dialog[open] button')].find(button => button.textContent?.trim() === label);
const dialogText = () => document.querySelector<HTMLElement>('dialog[open]')?.textContent ?? '';
const dialogGone = () => document.querySelector('dialog[open]') === null;

const openDeleteDialog = async (actName: string) => {
    await userEvent.click(requireValue(findButton(`Act ${actName} actions`)));
    await userEvent.click(requireValue(deleteActMenuItem()));
    await waitFor(() => document.querySelector('dialog[open]'));
};

const confirmDeleteAct = async () => {
    await userEvent.click(requireValue(dialogButton('Delete act')));
};

const undoChord = () => (isApplePlatform() ? '{Meta>}z{/Meta}' : '{Control>}z{/Control}');

describe('Board act deletion', () => {
    it('describes the first act, and Cancel and Escape leave the document unchanged', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);
        await openDeleteDialog('ACT ONE');

        expect(dialogText()).toContain('Delete act “ACT ONE”?');
        expect(dialogText()).toContain('Its scenes will become unassigned. No scenes will be deleted.');

        await userEvent.click(requireValue(dialogButton('Cancel')));
        await waitFor(dialogGone);
        // Cancel returns focus to the act's menu trigger, so the keyboard can carry on from there.
        await expect.poll(() => document.activeElement?.getAttribute('aria-label')).toBe('Act ACT ONE actions');
        expect(document.querySelectorAll('section')).toHaveLength(2);
        expect(sceneHeadings()).toHaveLength(3);

        await userEvent.keyboard('{Enter}');
        await userEvent.click(requireValue(deleteActMenuItem()));
        await waitFor(() => document.querySelector('dialog[open]'));
        await userEvent.keyboard('{Escape}');
        await waitFor(dialogGone);
        expect(document.querySelectorAll('section')).toHaveLength(2);
        expect(sceneHeadings()).toHaveLength(3);
    });

    it('unassigns the first act’s scenes on confirm, refocuses the board, and undo restores the act', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);
        await openDeleteDialog('ACT ONE');
        await confirmDeleteAct();

        await waitFor(() => document.querySelector('section[aria-label="ACT ONE"]') === null);
        expect(document.querySelectorAll('section')).toHaveLength(2);
        expect(sceneHeadings()).toHaveLength(3);
        // With the act (and its menu trigger) gone, focus falls back to a surviving board control.
        await expect.poll(() => document.activeElement?.getAttribute('aria-label')).toBe('Add act at the end');

        await userEvent.keyboard(undoChord());
        await waitFor(() => document.querySelector('section[aria-label="ACT ONE"]'));
        expect(sceneHeadings()).toHaveLength(3);
    });

    it('moves a later act’s scenes to the previous act on confirm, and undo restores it', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);
        await openDeleteDialog('ACT TWO');

        expect(dialogText()).toContain('Its scenes will move to “ACT ONE”. No scenes will be deleted.');
        await confirmDeleteAct();

        await waitFor(() => document.querySelector('section[aria-label="ACT TWO"]') === null);
        expect(document.querySelectorAll('section')).toHaveLength(1);
        expect(document.querySelector('section[aria-label="ACT ONE"]')?.textContent).toContain('Roof');
        expect(sceneHeadings()).toHaveLength(3);

        await userEvent.keyboard(undoChord());
        await waitFor(() => document.querySelector('section[aria-label="ACT TWO"]'));
        expect(document.querySelector('section[aria-label="ACT ONE"]')?.textContent).not.toContain('Roof');
    });

    it('keeps Undo from acting behind the open confirmation, and working after Cancel', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);
        // One undoable change: a new act at the end, its name edit committed with Enter.
        await userEvent.click(requireValue(findButton('Add act at the end')));
        await waitFor(() => document.querySelector('section[aria-label="ACT 3"]'));
        await userEvent.keyboard('{Enter}');

        await openDeleteDialog('ACT ONE');

        // Undo with the confirmation open changes nothing: not the document, not the dialog.
        await userEvent.keyboard(undoChord());
        expect(document.querySelector('dialog[open]')).not.toBeNull();
        expect(document.querySelector('section[aria-label="ACT 3"]')).not.toBeNull();
        expect(document.querySelectorAll('section')).toHaveLength(3);

        await userEvent.click(requireValue(dialogButton('Cancel')));
        await waitFor(dialogGone);

        // With the dialog gone, the same chord undoes the added act.
        await userEvent.keyboard(undoChord());
        await waitFor(() => document.querySelector('section[aria-label="ACT 3"]') === null);
        expect(document.querySelectorAll('section')).toHaveLength(2);
        expect(sceneHeadings()).toHaveLength(3);
    });

    it('treats the first real act as first even when unassigned scenes precede it', async () => {
        const {scriptId} = await createScript();

        await mountApp(`/script/${scriptId}/board/wall`);
        await waitFor(() => sceneHeadings().length === 3);
        // Deleting ACT ONE leaves its scene unassigned, so unassigned scenes now precede ACT TWO.
        await openDeleteDialog('ACT ONE');
        await confirmDeleteAct();
        await waitFor(() => document.querySelector('section[aria-label="ACT ONE"]') === null);

        await openDeleteDialog('ACT TWO');
        expect(dialogText()).toContain('Its scenes will become unassigned. No scenes will be deleted.');
        await userEvent.click(requireValue(dialogButton('Cancel')));
        await waitFor(dialogGone);
        expect(document.querySelectorAll('section')).toHaveLength(2);
        expect(sceneHeadings()).toHaveLength(3);
    });
});
