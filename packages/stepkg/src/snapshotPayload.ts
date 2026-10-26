import {SCRIPT_DOCUMENT_SCHEMA_VERSION} from '@stagistic/script';
import {deflateSync, inflateSync} from 'fflate';

import type {StepkgSnapshot} from './contracts';
import type {StepkgImportIssue} from './importContracts';
import {stableJsonBytes} from './stableJson';

/*
 * Payload of a stored script snapshot (UI: Draft/Version): the same
 * StepkgSnapshot a .stepkg is built from, without asset bytes. Attachment
 * contentKey values stay FileStorage keys, so the payload shares blobs with
 * the script instead of copying them.
 */
export const STEPKG_SNAPSHOT_PAYLOAD_FORMAT = 'stagistic-snapshot' as const;
export const STEPKG_SNAPSHOT_PAYLOAD_VERSION = 1 as const;

interface StepkgSnapshotPayloadEnvelope {
    format: typeof STEPKG_SNAPSHOT_PAYLOAD_FORMAT,
    formatVersion: typeof STEPKG_SNAPSHOT_PAYLOAD_VERSION,
    documentSchemaVersion: number,
    snapshot: StepkgSnapshot,
}

export type StepkgSnapshotPayloadResult =
    | {
        ok: true,
        snapshot: StepkgSnapshot,
        documentSchemaVersion: number,
    }
    | {ok: false, issues: StepkgImportIssue[]};

export const encodeStepkgSnapshotPayload = (snapshot: StepkgSnapshot): Uint8Array => {
    const envelope: StepkgSnapshotPayloadEnvelope = {
        format: STEPKG_SNAPSHOT_PAYLOAD_FORMAT,
        formatVersion: STEPKG_SNAPSHOT_PAYLOAD_VERSION,
        documentSchemaVersion: SCRIPT_DOCUMENT_SCHEMA_VERSION,
        snapshot,
    };

    return deflateSync(stableJsonBytes(envelope));
};

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object';

export const decodeStepkgSnapshotPayload = (bytes: Uint8Array): StepkgSnapshotPayloadResult => {
    let envelope: unknown;

    try {
        envelope = JSON.parse(new TextDecoder().decode(inflateSync(bytes)));
    } catch {
        return {ok: false, issues: [{code: 'schema_invalid', stage: 'read'}]};
    }

    if (!isRecord(envelope) || envelope.format !== STEPKG_SNAPSHOT_PAYLOAD_FORMAT) {
        return {ok: false, issues: [{code: 'manifest_invalid', stage: 'manifest'}]};
    }

    if (envelope.formatVersion !== STEPKG_SNAPSHOT_PAYLOAD_VERSION) {
        return {
            ok: false,
            issues: [
                {
                    code: 'unsupported_format_version',
                    stage: 'manifest',
                    details: {found: String(envelope.formatVersion), supported: STEPKG_SNAPSHOT_PAYLOAD_VERSION},
                },
            ],
        };
    }

    const {documentSchemaVersion, snapshot} = envelope;

    if (typeof documentSchemaVersion !== 'number' || documentSchemaVersion > SCRIPT_DOCUMENT_SCHEMA_VERSION) {
        return {
            ok: false,
            issues: [
                {
                    code: 'unsupported_document_schema_version',
                    stage: 'manifest',
                    details: {found: String(documentSchemaVersion), supported: SCRIPT_DOCUMENT_SCHEMA_VERSION},
                },
            ],
        };
    }

    if (!isRecord(snapshot) || !isRecord(snapshot.script) || !isRecord(snapshot.document)) {
        return {ok: false, issues: [{code: 'schema_invalid', stage: 'schema'}]};
    }

    return {
        ok: true,
        snapshot: snapshot as unknown as StepkgSnapshot,
        documentSchemaVersion,
    };
};
