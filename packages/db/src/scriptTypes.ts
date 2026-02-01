import type {InferSelectModel} from 'drizzle-orm';

import {scripts} from './schema';

export type Script = InferSelectModel<typeof scripts>;

export type ScriptSummary = Pick<Script, 'id' | 'title' | 'createdAt' | 'updatedAt'> & {
    activeBlockId?: Script['activeBlockId'],
};
