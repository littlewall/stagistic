import type {EditorSettingsOverride, ScriptDocument, TitlePageSettings} from '@stagistic/script';

import type {STEPKG_DOCUMENT_PATH, STEPKG_FORMAT, STEPKG_FORMAT_VERSION, STEPKG_TEXT_PATH} from './constants';

export interface StepkgScriptData {
    id: string;
    title: string;
    subtitle: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface StepkgCharacter {
    id: string;
    key: string;
    colorHex: string | null;
    genderKey: string | null;
    notes: string | null;
    backstory: string | null;
    outline: string | null;
    voiceType: string | null;
    vocalRangeLow: string | null;
    vocalRangeHigh: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface StepkgCharacterGroup {
    id: string;
    key: string;
    colorHex: string | null;
    memberIds: string[];
    createdAt: string;
    updatedAt: string;
}

export interface StepkgGenderOption {
    id: string;
    key: string;
    label: string;
    createdAt: string;
    updatedAt: string;
}

export interface StepkgCharactersData {
    characters: StepkgCharacter[];
    groups: StepkgCharacterGroup[];
    genderOptions: StepkgGenderOption[];
}

export interface StepkgMusicItem {
    id: string;
    sceneNumber: number;
    indexInScene: number;
    mode: string;
    title: string;
    kind: string | null;
    startBlockId: string | null;
    endBlockId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface StepkgMusicData {
    items: StepkgMusicItem[];
}

export interface StepkgLocation {
    id: string;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface StepkgScene {
    id: string;
    headingBlockId: string | null;
    sceneNumber: string | null;
    colorHex: string | null;
    synopsis: string | null;
    locationIds: string[];
    createdAt: string;
    updatedAt: string;
}

export interface StepkgScenesData {
    scenes: StepkgScene[];
    locations: StepkgLocation[];
}

export interface StepkgAttachmentBinding {
    target: {type: 'music'; id: string};
    attachmentId: string;
    role: string;
    order: number;
    createdAt: string;
}

export interface StepkgAttachmentSnapshot {
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
    updatedAt: string;
    contentKey: string;
}

export interface StepkgAttachmentData {
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    assetPath: string;
    createdAt: string;
    updatedAt: string;
}

export interface StepkgAttachmentsData {
    items: StepkgAttachmentData[];
    bindings: StepkgAttachmentBinding[];
}

export interface StepkgCommentThread {
    id: string;
    anchorKind: 'range' | 'block';
    anchorBlockId: string | null;
    quotedText: string;
    status: 'open' | 'resolved';
    resolvedAt: string | null;
    resolvedBy: string | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface StepkgCommentMessage {
    id: string;
    threadId: string;
    authorId: string;
    body: string;
    createdAt: string;
    updatedAt: string;
    editedAt: string | null;
}

export interface StepkgCommentsData {
    threads: StepkgCommentThread[];
    messages: StepkgCommentMessage[];
}

export interface StepkgSnapshot {
    script: StepkgScriptData;
    document: ScriptDocument;
    titlePage: TitlePageSettings;
    settings: EditorSettingsOverride;
    characters: StepkgCharactersData;
    music: StepkgMusicData;
    scenes: StepkgScenesData;
    attachments: StepkgAttachmentSnapshot[];
    attachmentBindings: StepkgAttachmentBinding[];
    comments: StepkgCommentsData;
}

export interface StepkgManifestFile {
    path: string;
    mediaType: string;
    byteLength: number;
    sha256: string;
}

export interface StepkgManifest {
    format: typeof STEPKG_FORMAT;
    formatVersion: typeof STEPKG_FORMAT_VERSION;
    documentSchemaVersion: number;
    createdAt: string;
    generator: {name: string; version: string};
    script: {id: string; title: string; updatedAt: string};
    entrypoints: {
        document: typeof STEPKG_DOCUMENT_PATH;
        text: typeof STEPKG_TEXT_PATH;
    };
    files: StepkgManifestFile[];
}

export interface StepkgEntry {
    path: string;
    mediaType: string;
    bytes: Uint8Array;
    compression: 'deflate' | 'store';
}

export type StepkgExportResult = {ok: true; blob: Blob; fileName: string; manifest: StepkgManifest} | {ok: false; issues: StepkgExportIssue[]};

export interface BuildStepkgEntriesArgs {
    snapshot: StepkgSnapshot;
    generator: {name: string; version: string};
    createdAt: Date;
    loadAsset: (contentKey: string) => Promise<Blob | null>;
    serializeContent?: (snapshot: StepkgSnapshot) => StepkgEntry[];
}

export type StepkgBuildResult = {ok: true; manifest: StepkgManifest; entries: StepkgEntry[]} | {ok: false; issues: StepkgExportIssue[]};

export type StepkgIssueCode =
    | 'editor_flush_failed'
    | 'script_not_found'
    | 'invalid_snapshot'
    | 'duplicate_id'
    | 'broken_reference'
    | 'asset_blob_missing'
    | 'asset_read_failed'
    | 'serialization_failed'
    | 'archive_creation_failed';

export type StepkgIssueStage = 'flush' | 'snapshot' | 'validation' | 'assets' | 'serialization' | 'archive';

export interface StepkgExportIssue {
    code: StepkgIssueCode;
    stage: StepkgIssueStage;
    entity?: {
        type: 'script' | 'character' | 'music' | 'scene' | 'attachment' | 'comment';
        id: string;
        label?: string;
    };
    path?: string;
    details?: Record<string, string | number>;
}
