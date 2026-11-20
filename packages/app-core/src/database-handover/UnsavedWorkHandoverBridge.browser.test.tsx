import {addUnsavedWorkParticipant} from '@stagistic/shared';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {
    type DatabaseHandover,
    type DatabaseHandoverParticipant,
    DatabaseHandoverProvider,
} from './DatabaseHandoverContext';
import {UnsavedWorkHandoverBridge} from './UnsavedWorkHandoverBridge';

const roots: Root[] = [];

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('the unsaved-work handover bridge', () => {
    it('hands the participants that cannot reach the handover themselves to it', async () => {
        const participants: DatabaseHandoverParticipant[] = [];
        const handover: DatabaseHandover = {
            getState: () => ({status: 'idle'}),
            subscribe: () => () => {},
            addParticipant: participant => {
                participants.push(participant);

                return () => {};
            },
        };
        const flush = vi.fn(() => Promise.resolve(true));
        const stopEditing = vi.fn();
        const root = createRoot(document.body.appendChild(document.createElement('div')));

        roots.push(root);
        root.render(<DatabaseHandoverProvider handover={handover}><UnsavedWorkHandoverBridge /></DatabaseHandoverProvider>);
        await vi.waitFor(() => expect(participants).toHaveLength(1));

        expect(participants[0]?.getText?.()).toBe('');

        // Added after the bridge mounted: the bridge reads the live set.
        const remove = addUnsavedWorkParticipant({
            flush,
            stopEditing,
            getText: () => 'Outline for ANNA: rival',
        });

        participants[0]?.stopEditing?.();
        expect(stopEditing).toHaveBeenCalledTimes(1);
        await expect(participants[0]?.flush()).resolves.toBe(true);
        expect(flush).toHaveBeenCalledTimes(1);
        expect(participants[0]?.getText?.()).toBe('Outline for ANNA: rival');

        flush.mockResolvedValueOnce(false);
        await expect(participants[0]?.flush()).resolves.toBe(false);
        remove();
    });
});
