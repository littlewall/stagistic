import {
    createScriptEditingLocks,
    type EditingChannel,
    type EditingMessage,
    type ScriptEditingLocks,
} from '@stagistic/app-core';

const CHANNEL_NAME = 'stagistic-script-editing';

/** Web Locks for who edits, a BroadcastChannel for asking the editing tab to hand over. */
export const createBrowserEditingLocks = (takeoverTimeoutMs?: number): ScriptEditingLocks => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    const editingChannel: EditingChannel = {
        post: message => channel.postMessage(message),
        subscribe: listener => {
            const onMessage = (event: MessageEvent<EditingMessage>) => listener(event.data);

            channel.addEventListener('message', onMessage);

            return () => channel.removeEventListener('message', onMessage);
        },
    };

    return createScriptEditingLocks({
        locks: navigator.locks,
        channel: editingChannel,
        takeoverTimeoutMs,
    });
};

export const browserEditingLocks = createBrowserEditingLocks();
