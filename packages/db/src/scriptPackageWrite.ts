import type {EditorSettingsOverride, ScriptDocument, TitlePageSettings} from '@stagistic/script';

import type {MusicAttachmentRole} from './types';

export interface ScriptPackageWriteCharacter {
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
    createdAt: number;
    updatedAt: number;
}

export interface ScriptPackageWriteGroup {
    id: string;
    key: string;
    colorHex: string | null;
    memberIds: string[];
    createdAt: number;
    updatedAt: number;
}

export interface ScriptPackageWriteGender {
    id: string;
    key: string;
    label: string;
    createdAt: number;
    updatedAt: number;
}

export interface ScriptPackageWriteMusic {
    id: string;
    sceneNumber: number;
    indexInScene: number;
    mode: string;
    title: string;
    kind: string | null;
    startBlockId: string | null;
    endBlockId: string | null;
    createdAt: number;
    updatedAt: number;
}

export interface ScriptPackageWriteLocation {
    id: string;
    name: string;
    description: string | null;
    createdAt: number;
    updatedAt: number;
}

export interface ScriptPackageWriteScene {
    headingBlockId: string | null;
    colorHex: string | null;
    synopsis: string | null;
    locationIds: string[];
}

export interface ScriptPackageWriteAttachment {
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    blob: Blob;
    createdAt: number;
    updatedAt: number;
}

export interface ScriptPackageWriteBinding {
    musicId: string;
    attachmentId: string;
    role: MusicAttachmentRole;
    sortOrder: number;
    createdAt: number;
}

export interface ScriptPackageWriteCommentThread {
    id: string;
    anchorKind: string;
    anchorBlockId: string | null;
    quotedText: string;
    status: string;
    resolvedAt: number | null;
    resolvedBy: string | null;
    createdBy: string;
    createdAt: number;
    updatedAt: number;
}

export interface ScriptPackageWriteCommentMessage {
    id: string;
    threadId: string;
    authorId: string;
    body: string;
    createdAt: number;
    updatedAt: number;
    editedAt: number | null;
}

export interface ScriptPackageWrite {
    script: {id: string; title: string; subtitle: string | null; createdAt: number; updatedAt: number};
    document: ScriptDocument;
    titlePage: TitlePageSettings;
    settings: EditorSettingsOverride;
    characters: ScriptPackageWriteCharacter[];
    groups: ScriptPackageWriteGroup[];
    genders: ScriptPackageWriteGender[];
    music: ScriptPackageWriteMusic[];
    locations: ScriptPackageWriteLocation[];
    scenes: ScriptPackageWriteScene[];
    attachments: ScriptPackageWriteAttachment[];
    bindings: ScriptPackageWriteBinding[];
    comments: {threads: ScriptPackageWriteCommentThread[]; messages: ScriptPackageWriteCommentMessage[]};
}
