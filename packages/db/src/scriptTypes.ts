import type {InferSelectModel} from 'drizzle-orm';

import {
    scriptCharacters,
    scriptCharacterGenders,
    scriptConfigBlocks,
    scriptConfigs,
    scripts,
} from './schema';

export type Script = InferSelectModel<typeof scripts>;

export type ScriptSummary = Pick<Script, 'id' | 'title' | 'createdAt' | 'updatedAt'> & {
    activeBlockId?: Script['activeBlockId'],
};

export type ScriptConfig = InferSelectModel<typeof scriptConfigs>;
export type ScriptConfigBlock = InferSelectModel<typeof scriptConfigBlocks>;
export type ScriptCharacter = InferSelectModel<typeof scriptCharacters>;
export type ScriptCharacterGender = InferSelectModel<typeof scriptCharacterGenders>;
