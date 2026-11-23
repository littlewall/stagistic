import {SCRIPT_DOCUMENT_SCHEMA_VERSION} from '@stagistic/script';
import {unzip} from 'fflate';

import {
    STEPKG_FORMAT,
    STEPKG_FORMAT_VERSION,
    STEPKG_MANIFEST_PATH,
} from './constants';
import type {StepkgManifest} from './contracts';
import type {StepkgImportIssue} from './importContracts';

const unzipAsync = (bytes: Uint8Array): Promise<Record<string, Uint8Array>> => new Promise((resolve, reject) => {
    unzip(bytes, (error, data) => error ? reject(error) : resolve(data));
});

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isManifestShape = (manifest: unknown): manifest is StepkgManifest => isRecord(manifest)
    && manifest.format === STEPKG_FORMAT
    && Array.isArray(manifest.files)
    && manifest.files.every(file => isRecord(file)
        && typeof file.path === 'string'
        && typeof file.byteLength === 'number'
        && typeof file.sha256 === 'string')
    && isRecord(manifest.script)
    && typeof manifest.script.id === 'string';

export type StepkgContainerResult = {
    ok: true,
    manifest: StepkgManifest,
    files: Map<string, Uint8Array>,
} | {ok: false, issues: StepkgImportIssue[]};

export const readStepkgContainer = async (bytes: Uint8Array): Promise<StepkgContainerResult> => {
    let entries: Record<string, Uint8Array>;

    try {
        entries = await unzipAsync(bytes);
    } catch {
        return {ok: false, issues: [{code: 'not_a_zip', stage: 'read'}]};
    }

    const manifestBytes = entries[STEPKG_MANIFEST_PATH];

    if (!manifestBytes) {
        return {
            ok: false,
            issues: [
                {
                    code: 'manifest_invalid',
                    stage: 'manifest',
                    path: STEPKG_MANIFEST_PATH,
                },
            ],
        };
    }

    let manifest: StepkgManifest;

    try {
        manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as StepkgManifest;
    } catch {
        return {
            ok: false,
            issues: [
                {
                    code: 'manifest_invalid',
                    stage: 'manifest',
                    path: STEPKG_MANIFEST_PATH,
                },
            ],
        };
    }

    if (!isManifestShape(manifest)) {
        return {
            ok: false,
            issues: [
                {
                    code: 'manifest_invalid',
                    stage: 'manifest',
                    path: STEPKG_MANIFEST_PATH,
                },
            ],
        };
    }

    if (manifest.formatVersion !== STEPKG_FORMAT_VERSION) {
        return {
            ok: false,
            issues: [
                {
                    code: 'unsupported_format_version',
                    stage: 'manifest',
                    details: {found: manifest.formatVersion, supported: STEPKG_FORMAT_VERSION},
                },
            ],
        };
    }

    if (typeof manifest.documentSchemaVersion !== 'number' || manifest.documentSchemaVersion > SCRIPT_DOCUMENT_SCHEMA_VERSION) {
        return {
            ok: false,
            issues: [
                {
                    code: 'unsupported_document_schema_version',
                    stage: 'manifest',
                    details: {found: manifest.documentSchemaVersion, supported: SCRIPT_DOCUMENT_SCHEMA_VERSION},
                },
            ],
        };
    }

    const files = new Map(Object.entries(entries));

    return {
        ok: true,
        manifest,
        files,
    };
};
