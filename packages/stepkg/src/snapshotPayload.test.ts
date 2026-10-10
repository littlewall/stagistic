import {SCRIPT_DOCUMENT_SCHEMA_VERSION} from '@stagistic/script';
import {deflateSync} from 'fflate';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {StepkgSnapshot} from './contracts';
import {decodeStepkgSnapshotPayload, encodeStepkgSnapshotPayload} from './snapshotPayload';
import {stableJsonBytes} from './stableJson';

const snapshot: StepkgSnapshot = {
    script: {
        id: 'script-1',
        title: 'The door',
        subtitle: null,
        createdAt: '2026-10-09T10:00:00.000Z',
        updatedAt: '2026-10-09T11:00:00.000Z',
    },
    document: {
        type: 'doc',
        content: [
            {
                type: 'scene',
                attrs: {id: 'block-1'},
                content: [{type: 'text', text: 'Scene One'}],
            },
        ],
    },
    titlePage: {},
    settings: {},
    characters: {
        characters: [],
        groups: [],
        genderOptions: [],
    },
    music: {items: []},
    scenes: {scenes: [], locations: []},
    attachments: [
        {
            id: 'a1',
            filename: 'score.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 3,
            contentKey: 'storage-key-1',
            createdAt: '2026-10-09T10:00:00.000Z',
            updatedAt: '2026-10-09T10:00:00.000Z',
        },
    ],
    attachmentBindings: [],
    comments: {threads: [], messages: []},
};

const encodeEnvelope = (envelope: unknown) => deflateSync(stableJsonBytes(envelope));

describe('snapshot payload', () => {
    it('round-trips a snapshot and keeps attachment storage keys', () => {
        const decoded = decodeStepkgSnapshotPayload(encodeStepkgSnapshotPayload(snapshot));

        expect(decoded).toEqual({
            ok: true,
            snapshot,
            documentSchemaVersion: SCRIPT_DOCUMENT_SCHEMA_VERSION,
        });
    });

    it('accepts an older document schema version', () => {
        const decoded = decodeStepkgSnapshotPayload(encodeEnvelope({
            format: 'stagistic-snapshot',
            formatVersion: 1,
            documentSchemaVersion: 1,
            snapshot,
        }));

        expect(decoded.ok && decoded.documentSchemaVersion).toBe(1);
    });

    it('rejects a newer document schema version', () => {
        const decoded = decodeStepkgSnapshotPayload(encodeEnvelope({
            format: 'stagistic-snapshot',
            formatVersion: 1,
            documentSchemaVersion: SCRIPT_DOCUMENT_SCHEMA_VERSION + 1,
            snapshot,
        }));

        expect(decoded.ok ? null : decoded.issues[0]?.code).toBe('unsupported_document_schema_version');
    });

    it('rejects bytes that are not a snapshot payload', () => {
        expect(decodeStepkgSnapshotPayload(new Uint8Array([
            1,
            2,
            3,
        ])).ok).toBe(false);
        expect(decodeStepkgSnapshotPayload(encodeEnvelope({format: 'other'})).ok).toBe(false);
    });
});
