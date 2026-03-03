import type {InferSelectModel} from 'drizzle-orm';

import {
    scriptActs,
    scriptBlockAnnotations,
    scriptBlockCharacterRefs,
    scriptBlocks,
    scriptConfigBlocks,
    scriptConfigs,
    scriptCostumes,
    scriptCueSheetAnnotations,
    scriptCueSheets,
    scriptLayers,
    scriptLocations,
    scriptMembers,
    scriptPermissions,
    scriptProps,
    scripts,
    scriptSceneCostumes,
    scriptSceneProps,
    scriptScenes,
    scriptSceneVersions,
    scriptTitlePageFields,
    scriptViews,
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

export type ScriptLayer = InferSelectModel<typeof scriptLayers>;
export type ScriptBlockAnnotation = InferSelectModel<typeof scriptBlockAnnotations>;
export type ScriptView = InferSelectModel<typeof scriptViews>;
export type ScriptSceneVersion = InferSelectModel<typeof scriptSceneVersions>;
export type ScriptProp = InferSelectModel<typeof scriptProps>;
export type ScriptSceneProp = InferSelectModel<typeof scriptSceneProps>;
export type ScriptCostume = InferSelectModel<typeof scriptCostumes>;
export type ScriptSceneCostume = InferSelectModel<typeof scriptSceneCostumes>;
export type ScriptCueSheet = InferSelectModel<typeof scriptCueSheets>;
export type ScriptCueSheetAnnotation = InferSelectModel<typeof scriptCueSheetAnnotations>;
export type ScriptMember = InferSelectModel<typeof scriptMembers>;
export type ScriptPermission = InferSelectModel<typeof scriptPermissions>;
