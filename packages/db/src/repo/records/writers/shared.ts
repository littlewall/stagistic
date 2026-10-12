import {type RecordFields} from '@stagistic/sync-engine';
import {eq} from 'drizzle-orm';

import type {DbClient} from '../../../queries';
import {
    scriptAttachments,
    scriptCharacters,
    scriptCommentThreads,
    scriptLocations,
    scriptMusic,
} from '../../../schema';

export type Upserts = Record<string, RecordFields | null>;

export const str = (value: unknown) => (typeof value === 'string' ? value : null);
export const num = (value: unknown, fallback: number) => (typeof value === 'number' ? value : fallback);
export const ids = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);

export interface WriteContext {
    tx: DbClient,
    scriptId: string,
    now: number,
}

export type ScriptOwnedTable = typeof scriptCharacters | typeof scriptLocations | typeof scriptMusic | typeof scriptAttachments | typeof scriptCommentThreads;

export const existingIds = async (tx: DbClient, table: ScriptOwnedTable, scriptId: string) => {
    const rows = await tx.select({id: table.id}).from(table).where(eq(table.scriptId, scriptId));

    return new Set(rows.map(row => row.id));
};
