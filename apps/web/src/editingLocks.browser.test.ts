import type {ScriptEditingSession} from '@stagistic/app-core';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {createBrowserEditingLocks} from './editingLocks';

/*
 * Two "tabs" in one page: each has its own locks object and channel, over the
 * real Web Locks and BroadcastChannel, which are shared per origin like tabs.
 */
const releases: (() => void)[] = [];
const openTab = (scriptId: string, timeoutMs = 400) => {
    const session = createBrowserEditingLocks(timeoutMs).session(scriptId);

    releases.push(session.retain());

    return session;
};
const settled = (session: ScriptEditingSession) => vi.waitFor(() => expect(session.getState().role).not.toBe('acquiring'));
let counter = 0;
const nextScriptId = () => `script-${Date.now()}-${counter++}`;

afterEach(() => {
    releases.splice(0).forEach(release => release());
});

describe('one editing tab per script', () => {
    it('opens read-only while another tab edits', async () => {
        const scriptId = nextScriptId();
        const first = openTab(scriptId);

        await settled(first);

        const second = openTab(scriptId);

        await settled(second);

        expect(first.getState().role).toBe('editing');
        expect(second.getState()).toMatchObject({role: 'read-only', reason: 'held-elsewhere'});
    });

    it('lets different scripts be edited in different tabs', async () => {
        const first = openTab(nextScriptId());
        const second = openTab(nextScriptId());

        await settled(first);
        await settled(second);

        expect([first.getState().role, second.getState().role]).toEqual(['editing', 'editing']);
    });

    it('moves editing after the editing tab flushed its unsaved text', async () => {
        const scriptId = nextScriptId();
        const first = openTab(scriptId);
        const flush = vi.fn(() => Promise.resolve(true));

        await settled(first);
        first.registerParticipant({
            flush,
            isDirty: () => true,
            getText: () => 'typed',
        });

        const second = openTab(scriptId);

        await settled(second);
        await second.takeOver();

        expect(flush).toHaveBeenCalledOnce();
        expect(second.getState()).toMatchObject({role: 'editing', reason: null});
        await vi.waitFor(() => expect(first.getState()).toMatchObject({
            role: 'read-only',
            reason: 'handed-over',
            rescueText: null,
        }));
    });

    it('keeps the text for rescue when the editing tab could not save before handing over', async () => {
        const scriptId = nextScriptId();
        const first = openTab(scriptId);

        await settled(first);
        first.registerParticipant({
            flush: () => Promise.resolve(false),
            isDirty: () => true,
            getText: () => 'only here',
        });

        const second = openTab(scriptId);

        await settled(second);
        await second.takeOver();

        await vi.waitFor(() => expect(first.getState().rescueText).toBe('only here'));
    });

    it('takes the lock anyway when the editing tab does not answer', async () => {
        const scriptId = nextScriptId();
        const first = openTab(scriptId);

        await settled(first);
        first.registerParticipant({
            flush: () => new Promise<boolean>(() => {}),
            isDirty: () => true,
            getText: () => 'asleep',
        });

        const second = openTab(scriptId, 150);

        await settled(second);
        await second.takeOver();

        expect(second.getState().role).toBe('editing');
        await vi.waitFor(() => expect(first.getState()).toMatchObject({
            role: 'read-only',
            reason: 'lost',
            rescueText: 'asleep',
        }));
    });

    it('hands editing to the read-only tab once the editing tab closed', async () => {
        const scriptId = nextScriptId();
        const first = openTab(scriptId);

        await settled(first);

        const second = openTab(scriptId);

        await settled(second);

        const before = second.getState().loadEpoch;

        releases[0]();

        await vi.waitFor(() => expect(second.getState()).toMatchObject({role: 'editing', reason: null}));
        // The text is loaded again, since the closed tab may have saved since.
        expect(second.getState().loadEpoch).toBeGreaterThan(before);
    });

    it('hands editing to exactly one of the waiting tabs', async () => {
        const scriptId = nextScriptId();
        const first = openTab(scriptId);

        await settled(first);

        const waiting = [openTab(scriptId), openTab(scriptId)];

        await Promise.all(waiting.map(settled));
        releases[0]();

        await vi.waitFor(() => expect(waiting.map(session => session.getState().role).toSorted()).toEqual(['editing', 'read-only']));
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(waiting.map(session => session.getState().role).toSorted()).toEqual(['editing', 'read-only']);
    });

    it('gets editing back after handing over, once the new editing tab closed', async () => {
        const scriptId = nextScriptId();
        const first = openTab(scriptId);

        await settled(first);

        const second = openTab(scriptId);

        await settled(second);
        await second.takeOver();
        await vi.waitFor(() => expect(first.getState().role).toBe('read-only'));
        releases[1]();

        await vi.waitFor(() => expect(first.getState().role).toBe('editing'));
    });

    it('reloads the text of a read-only tab without taking the lock', async () => {
        const scriptId = nextScriptId();
        const first = openTab(scriptId);

        await settled(first);

        const second = openTab(scriptId);

        await settled(second);

        const before = second.getState().loadEpoch;

        second.reload();

        expect(second.getState()).toMatchObject({role: 'read-only', loadEpoch: before + 1});
    });

    it('turns a tab read-only and keeps its text when a save was refused', async () => {
        const scriptId = nextScriptId();
        const first = openTab(scriptId);

        await settled(first);
        first.registerParticipant({
            flush: () => Promise.resolve(true),
            isDirty: () => true,
            getText: () => 'stale text',
        });
        expect(first.markRefused()).toBe(true);

        expect(first.getState()).toMatchObject({
            role: 'read-only',
            reason: 'refused',
            rescueText: 'stale text',
        });
    });

    it('keeps editing when the same tab remounts its view at once', async () => {
        const locks = createBrowserEditingLocks(400);
        const scriptId = nextScriptId();
        const session = locks.session(scriptId);
        const release = session.retain();

        await settled(session);
        release();
        releases.push(locks.session(scriptId).retain());
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(locks.session(scriptId)).toBe(session);
        expect(session.getState().role).toBe('editing');
    });

    it('lets go of the lock a moment after the last view left, and takes it again on reopen', async () => {
        const locks = createBrowserEditingLocks(400);
        const scriptId = nextScriptId();
        const session = locks.session(scriptId);
        const release = session.retain();

        await settled(session);
        release();
        await new Promise(resolve => setTimeout(resolve, 50));

        const other = openTab(scriptId);

        await settled(other);

        expect(other.getState().role).toBe('editing');
    });

    it('does not offer the script text as lost when it was saved or never typed', async () => {
        const scriptId = nextScriptId();
        const first = openTab(scriptId);

        await settled(first);
        // A side participant failed, but the script text itself is saved.
        first.registerParticipant({
            flush: () => Promise.resolve(false),
            isDirty: () => false,
            getText: () => 'saved text',
        });

        const second = openTab(scriptId, 100);

        await settled(second);
        await second.takeOver();

        await vi.waitFor(() => expect(first.getState()).toMatchObject({role: 'read-only', reason: 'handed-over'}));
        expect(first.getState().rescueText).toBeNull();
    });

    it('does not steal from a tab that took the lock while this one waited', async () => {
        const scriptId = nextScriptId();
        const holder = openTab(scriptId);

        await settled(holder);

        const second = openTab(scriptId, 150);
        const third = openTab(scriptId, 150);

        await settled(second);
        await settled(third);
        await Promise.all([second.takeOver(), third.takeOver()]);

        const states = [
            holder,
            second,
            third,
        ].map(session => session.getState());

        expect(states.filter(state => state.role === 'editing')).toHaveLength(1);
        expect(states.filter(state => state.reason === 'lost')).toHaveLength(0);
    });

    it('runs an exclusive action only while this tab may edit the script', async () => {
        const scriptId = nextScriptId();
        const locks = createBrowserEditingLocks(400);
        const elsewhere = openTab(scriptId);

        await settled(elsewhere);

        const refused = vi.fn(() => Promise.resolve('ran'));

        await expect(locks.runExclusive(scriptId, refused)).resolves.toEqual({ran: false});
        expect(refused).not.toHaveBeenCalled();

        releases[0]();
        await new Promise(resolve => setTimeout(resolve, 50));

        await expect(locks.runExclusive(scriptId, () => Promise.resolve('ran'))).resolves.toEqual({ran: true, value: 'ran'});
    });
});
