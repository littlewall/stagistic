import type {InferSelectModel} from 'drizzle-orm';

import {
    scriptActs,
    scriptAttachments,
    scriptBlockCharacterRefs,
    scriptBlocks,
    scriptLocations,
    scriptMusic,
    scriptMusicAttachments,
    scripts,
    scriptScenes,
    scriptSettingsBlocks,
    scriptSettingsTitlePage,
} from '../schema';
import type {MusicAttachmentRole} from './musicAttachments';

export type Script = InferSelectModel<typeof scripts>;

export interface ScriptSummary extends Pick<Script, 'id' | 'title' | 'createdAt' | 'updatedAt'> {
    activeBlockId?: Script['activeBlockId'],
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
type ScriptMusicAttachmentBindingRow = InferSelectModel<typeof scriptMusicAttachments>;

export interface ScriptMusicAttachmentBinding extends Omit<ScriptMusicAttachmentBindingRow, 'role'> {
    role: MusicAttachmentRole,
}

export interface ScriptMusicAttachment extends ScriptAttachment {
    role: MusicAttachmentRole,
}
