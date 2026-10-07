import {
    describe,
    expect,
    it,
} from 'vite-plus/test';
import * as Y from 'yjs';

import {
    block,
    blockText,
    doc,
} from '../testing/fixtures';
import {bodyDocToScriptDocument, seedBodyDoc} from '../ydoc/bodyCodec';
import {createBroadcastSync} from './broadcastSync';

/** In-memory BroadcastChannel: delivers synchronously to other members. */
const createBus = () => {
    const members = new Set<{deliver: (data: unknown) => void}>();

    return (_name: string) => {
        const listeners = new Set<(event: {data: unknown}) => void>();
        const member = {deliver: (data: unknown) => listeners.forEach(listener => listener({data}))};

        members.add(member);

        return {
            postMessage: (data: unknown) => members.forEach(other => other !== member && other.deliver(data)),
            addEventListener: (_type: 'message', listener: (event: {data: unknown}) => void) => listeners.add(listener),
            removeEventListener: (_type: 'message', listener: (event: {data: unknown}) => void) => listeners.delete(listener),
            close: () => members.delete(member),
        };
    };
};

describe('createBroadcastSync', () => {
    it('catches up a late replica in both directions and streams updates', () => {
        const channelFactory = createBus();
        const leader = new Y.Doc();

        seedBodyDoc(leader, doc(block('scene', 's1', 'From leader')));
        createBroadcastSync(leader, 'script/x/body', {channelFactory});

        const tab = new Y.Doc();

        // Offline edit made in the tab before it joined.
        tab.getMap('scratch').set('tabOnly', 1);
        createBroadcastSync(tab, 'script/x/body', {channelFactory});

        expect(bodyDocToScriptDocument(tab).content[0]?.content?.[0]?.text).toBe('From leader');
        expect(leader.getMap('scratch').get('tabOnly')).toBe(1);

        blockText(tab, 0).insert(0, '> ');

        expect(bodyDocToScriptDocument(leader)).toEqual(bodyDocToScriptDocument(tab));
    });
});
