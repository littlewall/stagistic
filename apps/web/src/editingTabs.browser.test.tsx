import '@stagistic/ui/styles/base.css';

import type {ScriptEditingSession} from '@stagistic/app-core';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {
    createTrackedScript,
    findButton,
    mountApp,
    repository,
    type ScriptDocument,
    waitFor,
} from './boardTestFixtures';
import {createBrowserEditingLocks} from './editingLocks';

/*
 * The app under test is one tab. The other tab is a bare editing session on the
 * same real Web Locks, whose "typing" is a save through the shared repository.
 */
const BANNER = 'This script is open for editing in another tab.';
const releases: (() => void)[] = [];
const document1 = (text: string): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'stageDirection',
            attrs: {id: 'only'},
            content: [{type: 'text', text}],
        },
    ],
});
const otherTab = async (scriptId: string, timeoutMs = 500) => {
    const session = createBrowserEditingLocks(timeoutMs).session(scriptId);

    releases.push(session.retain());
    await waitFor(() => session.getState().role !== 'acquiring');

    return session;
};
const pageText = () => window.document.body.textContent ?? '';
const press = async (label: string) => {
    const button = await waitFor(() => findButton(label));

    await page.elementLocator(button).click();
};
const idle = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

afterEach(() => {
    releases.splice(0).forEach(release => release());
});

describe('one editing tab per script, in the app', () => {
    it('opens read-only beside an editing tab and loads its newer text on request', async () => {
        const scriptId = await createTrackedScript('Two tabs', document1('First line'));
        const other: ScriptEditingSession = await otherTab(scriptId);

        expect(other.getState().role).toBe('editing');
        await mountApp(`/script/${scriptId}/editor`);
        await waitFor(() => pageText().includes(BANNER));
        await waitFor(() => pageText().includes('First line'));

        expect(findButton('Load new changes')).toBeUndefined();

        await repository.loadLatest(scriptId);
        await repository.saveLatest(scriptId, document1('Second line'));
        await press('Load new changes');
        await waitFor(() => pageText().includes('Second line'));

        expect(pageText()).toContain(BANNER);
        expect(findButton('Load new changes')).toBeUndefined();
    });

    it('moves editing here without losing the other tab\'s unsaved text', async () => {
        const scriptId = await createTrackedScript('Two tabs', document1('First line'));
        const other = await otherTab(scriptId);

        other.registerParticipant({
            flush: async () => {
                await repository.loadLatest(scriptId);
                await repository.saveLatest(scriptId, document1('Typed in the first tab'));

                return true;
            },
            isDirty: () => true,
            getText: () => 'Typed in the first tab',
        });
        await mountApp(`/script/${scriptId}/editor`);
        await waitFor(() => pageText().includes(BANNER));
        await press('Edit here');
        await waitFor(() => pageText().includes('Typed in the first tab') && !pageText().includes(BANNER));

        expect(other.getState()).toMatchObject({role: 'read-only', reason: 'handed-over'});
    });

    it('does not announce new changes after its own handover', async () => {
        const scriptId = await createTrackedScript('Two tabs', document1('First line'));

        await mountApp(`/script/${scriptId}/editor`);
        await waitFor(() => pageText().includes('First line'));

        const other = createBrowserEditingLocks(2000).session(scriptId);

        releases.push(other.retain());
        await waitFor(() => other.getState().role === 'read-only');
        await other.takeOver();
        await waitFor(() => pageText().includes(BANNER));
        await idle(1200);

        expect(findButton('Load new changes')).toBeUndefined();
    });
});
