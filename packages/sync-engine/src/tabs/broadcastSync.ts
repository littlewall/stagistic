import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import * as syncProtocol from 'y-protocols/sync';
import type * as Y from 'yjs';

/*
 * Same-origin replica sync over BroadcastChannel (tabs <-> leader worker).
 * Uses the y-protocols sync messages: on connect each replica broadcasts
 * step 1 (its state vector) and peers answer with step 2 (the missing diff),
 * so a replica that joins late — or a new leader that just loaded from
 * IndexedDB — catches up.
 */

export const broadcastChannelName = (docName: string) => `stagistic-ydoc:${docName}`;

type ChannelListener = (event: {data: unknown}) => void;

export interface ChannelLike {
    postMessage(message: unknown): void,
    addEventListener(type: 'message', listener: ChannelListener): void,
    removeEventListener(type: 'message', listener: ChannelListener): void,
    close(): void,
}

export interface BroadcastSync {
    readonly origin: object,
    /** Re-broadcasts step 1 (e.g. after leader handoff). */
    resync(): void,
    destroy(): void,
}

export interface CreateBroadcastSyncOptions {
    channelFactory?: (name: string) => ChannelLike,
}

export const createBroadcastSync = (doc: Y.Doc, docName: string, options: CreateBroadcastSyncOptions = {}): BroadcastSync => {
    const channel = options.channelFactory?.(broadcastChannelName(docName)) ?? new BroadcastChannel(broadcastChannelName(docName));
    const origin = {source: 'broadcast', docName};

    const post = (encoder: encoding.Encoder) => {
        channel.postMessage(encoding.toUint8Array(encoder));
    };

    /*
     * Step 1 pulls what peers have; the step 2 with our full state pushes what
     * only we have (peers ignore what they already know). Same machine, so the
     * full state is cheap.
     */
    const sendStep1 = () => {
        const step1 = encoding.createEncoder();

        syncProtocol.writeSyncStep1(step1, doc);
        post(step1);

        const step2 = encoding.createEncoder();

        syncProtocol.writeSyncStep2(step2, doc);
        post(step2);
    };

    const handleMessage: ChannelListener = event => {
        if (!(event.data instanceof Uint8Array)) {
            return;
        }

        const decoder = decoding.createDecoder(event.data);
        const reply = encoding.createEncoder();

        syncProtocol.readSyncMessage(decoder, reply, doc, origin);

        if (encoding.length(reply) > 0) {
            post(reply);
        }
    };

    const handleUpdate = (update: Uint8Array, updateOrigin: unknown) => {
        if (updateOrigin === origin) {
            return;
        }

        const encoder = encoding.createEncoder();

        syncProtocol.writeUpdate(encoder, update);
        post(encoder);
    };

    channel.addEventListener('message', handleMessage);
    doc.on('update', handleUpdate);
    sendStep1();

    return {
        origin,
        resync: sendStep1,
        destroy: () => {
            doc.off('update', handleUpdate);
            channel.removeEventListener('message', handleMessage);
            channel.close();
        },
    };
};
