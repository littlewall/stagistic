import type {InferSelectModel} from 'drizzle-orm';

import {
    scriptActs,
    scriptBlockCharacterRefs,
    scriptBlocks,
    scriptConfigBlocks,
    scriptConfigs,
    scriptCues,
    scriptLocations,
    scripts,
    scriptScenes,
    scriptTitlePageFields,
} from '../schema';

export type Script = InferSelectModel<typeof scripts>;

export interface ScriptSummary extends Pick<Script, 'id' | 'title' | 'createdAt' | 'updatedAt'> {
    activeBlockId?: Script['activeBlockId'],
}

export type ScriptConfig = InferSelectModel<typeof scriptConfigs>;
export type ScriptConfigBlock = InferSelectModel<typeof scriptConfigBlocks>;

export type ScriptBlock = InferSelectModel<typeof scriptBlocks>;
export type ScriptScene = InferSelectModel<typeof scriptScenes>;
export type ScriptAct = InferSelectModel<typeof scriptActs>;
export type ScriptTitlePageField = InferSelectModel<typeof scriptTitlePageFields>;
export type ScriptLocation = InferSelectModel<typeof scriptLocations>;
export type ScriptBlockCharacterRef = InferSelectModel<typeof scriptBlockCharacterRefs>;
export type ScriptCue = InferSelectModel<typeof scriptCues>;
