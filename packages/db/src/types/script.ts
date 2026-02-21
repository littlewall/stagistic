import type {InferSelectModel} from 'drizzle-orm';

import {
    scriptBlockIndexMeta,
    scriptBlockIndexRows,
    scriptConfigBlocks,
    scriptConfigs,
    scripts,
} from '../schema';

export type Script = InferSelectModel<typeof scripts>;

export interface ScriptSummary extends Pick<Script, 'id' | 'title' | 'createdAt' | 'updatedAt'> {
    activeBlockId?: Script['activeBlockId'],
}

export type ScriptConfig = InferSelectModel<typeof scriptConfigs>;
export type ScriptConfigBlock = InferSelectModel<typeof scriptConfigBlocks>;
export type ScriptBlockIndexMeta = InferSelectModel<typeof scriptBlockIndexMeta>;
export type ScriptBlockIndexRow = InferSelectModel<typeof scriptBlockIndexRows>;
