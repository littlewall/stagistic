import type {InferSelectModel} from 'drizzle-orm';

import {
    scriptActs,
    scriptAttachments,
    scriptBlockCharacterRefs,
    scriptBlocks,
    scriptCues,
    scriptLocations,
    scripts,
    scriptScenes,
    scriptSettingsBlocks,
    scriptSettingsTitlePage,
} from '../schema';
import type {CueAttachmentRole} from './cueAttachments';

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
export type ScriptCue = InferSelectModel<typeof scriptCues>;
export type ScriptAttachment = InferSelectModel<typeof scriptAttachments>;

export interface ScriptCueAttachment extends ScriptAttachment {
    role: CueAttachmentRole,
}
