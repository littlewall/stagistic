import {SCRIPT_DOCUMENT_SCHEMA_VERSION} from '@stagistic/script';

import {STEPKG_DOCUMENT_PATH, STEPKG_FORMAT, STEPKG_FORMAT_VERSION, STEPKG_TEXT_PATH} from './constants';
import type {BuildStepkgEntriesArgs, StepkgAttachmentData, StepkgBuildResult, StepkgEntry, StepkgExportIssue, StepkgManifest} from './contracts';
import {getStepkgAssetPath} from './paths';
import {serializeStepkgContent} from './serializeSnapshot';
import {sha256Hex} from './sha256';
import {stableJsonBytes} from './stableJson';
import {validateStepkgSnapshot} from './validateSnapshot';

const assetIssue = (
    code: 'asset_blob_missing' | 'asset_read_failed' | 'invalid_snapshot',
    id: string,
    label: string,
    details?: Record<string, number>,
): StepkgExportIssue => ({
    code,
    stage: 'assets',
    entity: {type: 'attachment', id, label},
    ...(details ? {details} : {}),
});

export const buildStepkgEntries = async ({
    snapshot,
    generator,
    createdAt,
    loadAsset,
    serializeContent = serializeStepkgContent,
}: BuildStepkgEntriesArgs): Promise<StepkgBuildResult> => {
    const validationIssues = validateStepkgSnapshot(snapshot);
    if (validationIssues.length > 0) return {ok: false as const, issues: validationIssues};

    let entries: StepkgEntry[];
    try {
        entries = serializeContent(snapshot);
    } catch {
        return {ok: false as const, issues: [{code: 'serialization_failed', stage: 'serialization'}]};
    }

    const assets: StepkgEntry[] = [];
    const attachmentData: StepkgAttachmentData[] = [];
    const assetIssues: StepkgExportIssue[] = [];
    for (const attachment of snapshot.attachments) {
        let blob: Blob | null;
        try {
            blob = await loadAsset(attachment.contentKey);
        } catch {
            assetIssues.push(assetIssue('asset_read_failed', attachment.id, attachment.filename));
            continue;
        }
        if (blob === null) {
            assetIssues.push(assetIssue('asset_blob_missing', attachment.id, attachment.filename));
            continue;
        }
        const bytes = new Uint8Array(await blob.arrayBuffer());
        if (bytes.byteLength !== attachment.sizeBytes) {
            assetIssues.push(
                assetIssue('invalid_snapshot', attachment.id, attachment.filename, {expectedSize: attachment.sizeBytes, actualSize: bytes.byteLength}),
            );
            continue;
        }
        const assetPath = getStepkgAssetPath(attachment);
        assets.push({path: assetPath, mediaType: attachment.mimeType, bytes, compression: attachment.mimeType === 'application/pdf' ? 'store' : 'deflate'});
        attachmentData.push({
            id: attachment.id,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            assetPath,
            createdAt: attachment.createdAt,
            updatedAt: attachment.updatedAt,
        });
    }
    if (assetIssues.length > 0) return {ok: false as const, issues: assetIssues};

    entries.push(
        {
            path: 'data/attachments.json',
            mediaType: 'application/json',
            bytes: stableJsonBytes({items: attachmentData, bindings: snapshot.attachmentBindings}),
            compression: 'deflate',
        },
        ...assets,
    );
    const files = await Promise.all(
        entries.map(async entry => ({path: entry.path, mediaType: entry.mediaType, byteLength: entry.bytes.byteLength, sha256: await sha256Hex(entry.bytes)})),
    );
    files.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
    const manifest: StepkgManifest = {
        format: STEPKG_FORMAT,
        formatVersion: STEPKG_FORMAT_VERSION,
        documentSchemaVersion: SCRIPT_DOCUMENT_SCHEMA_VERSION,
        createdAt: createdAt.toISOString(),
        generator,
        script: {id: snapshot.script.id, title: snapshot.script.title, updatedAt: snapshot.script.updatedAt},
        entrypoints: {document: STEPKG_DOCUMENT_PATH, text: STEPKG_TEXT_PATH},
        files,
    };
    entries.push({path: 'manifest.json', mediaType: 'application/json', bytes: stableJsonBytes(manifest), compression: 'deflate'});
    return {ok: true as const, manifest, entries};
};
