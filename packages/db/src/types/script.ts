import type {InferSelectModel} from 'drizzle-orm';

import {
    type scriptActs,
    type scriptAttachments,
    type scriptBlockCharacterRefs,
    type scriptBlocks,
    type scriptCommentMessages,
    type scriptCommentThreads,
    type scriptLocations,
    type scriptMusic,
    type scriptMusicAttachments,
    type scripts,
    type scriptScenes,
    type scriptSettingsBlocks,
    type scriptSettingsTitlePage,
    type scriptSnapshots,
} from '../schema';
import type {MusicAttachmentRole} from './musicAttachments';

export type Script = InferSelectModel<typeof scripts>;

export interface ScriptSummary extends Pick<Script, 'id' | 'title' | 'createdAt' | 'updatedAt'> {
    activeBlockId?: Script['activeBlockId'],
    summaryMetadata?: Script['summaryMetadata'],
    subtitle: string | null,
}

export type ScriptSettingsBlock = InferSelectModel<typeof scriptSettingsBlocks>;

export type ScriptBlock = InferSelectModel<typeof scriptBlocks>;
export type ScriptScene = InferSelectModel<typeof scriptScenes>;
export type ScriptAct = InferSelectModel<typeof scriptActs>;
export type ScriptTitlePageField = InferSelectModel<typeof scriptSettingsTitlePage>;
export type ScriptLocation = InferSelectModel<typeof scriptLocations>;
export type ScriptBlockCharacterRef = InferSelectModel<typeof scriptBlockCharacterRefs>;
export type ScriptMusic = InferSelectModel<typeof scriptMusic>;
export type ScriptAttachment = InferSelectModel<typeof scriptAttachments>;
export type ScriptCommentThread = InferSelectModel<typeof scriptCommentThreads>;
export type ScriptCommentMessage = InferSelectModel<typeof scriptCommentMessages>;
export type CommentThreadStatus = 'open' | 'resolved';
export type CommentAnchorKind = 'range' | 'block';
/** Single-user alpha: every author/creator id. Replace with the account id for collaboration. */
export const LOCAL_COMMENT_AUTHOR_ID = 'local';
type ScriptMusicAttachmentBindingRow = InferSelectModel<typeof scriptMusicAttachments>;

export interface ScriptMusicAttachmentBinding extends Omit<ScriptMusicAttachmentBindingRow, 'role'> {
    role: MusicAttachmentRole,
}

/** UI: a numbered Draft or a named Version. */
export type ScriptSnapshotKind = 'draft' | 'version';
type ScriptSnapshotRow = InferSelectModel<typeof scriptSnapshots>;

export interface ScriptSnapshot extends Omit<ScriptSnapshotRow, 'kind'> {
    kind: ScriptSnapshotKind,
}

export interface ScriptMusicAttachment extends ScriptAttachment {
    role: MusicAttachmentRole,
}
