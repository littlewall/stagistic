import {
    asc,
    eq,
} from 'drizzle-orm';

import {
    scriptBlockIndexMeta,
    scriptBlockIndexRows,
} from '../../schema';
import type {DbClient} from '../types';
import type {
    ScriptBlockIndexMetaUpsertPayload,
    ScriptBlockIndexRowsReplacePayload,
} from './payloads';

export const getScriptBlockIndexMeta = async (db: DbClient, scriptId: string) => {
    const rows = await db
        .select()
        .from(scriptBlockIndexMeta)
        .where(eq(scriptBlockIndexMeta.scriptId, scriptId))
        .limit(1);

    return rows[0] ?? null;
};

export const upsertScriptBlockIndexMeta = async (
    db: DbClient,
    payload: ScriptBlockIndexMetaUpsertPayload,
) => {
    await db
        .insert(scriptBlockIndexMeta)
        .values({
            scriptId: payload.scriptId,
            contentHash: payload.contentHash,
            indexSchemaVersion: payload.indexSchemaVersion,
            status: payload.status,
            updatedAt: payload.updatedAt,
            lastError: payload.lastError,
        })
        .onConflictDoUpdate({
            target: scriptBlockIndexMeta.scriptId,
            set: {
                contentHash: payload.contentHash,
                indexSchemaVersion: payload.indexSchemaVersion,
                status: payload.status,
                updatedAt: payload.updatedAt,
                lastError: payload.lastError,
            },
        });
};

export const listScriptBlockIndexRows = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptBlockIndexRows)
        .where(eq(scriptBlockIndexRows.scriptId, scriptId))
        .orderBy(asc(scriptBlockIndexRows.orderNo));
};

export const replaceScriptBlockIndexRows = async (
    db: DbClient,
    payload: ScriptBlockIndexRowsReplacePayload,
) => {
    await db.delete(scriptBlockIndexRows).where(eq(scriptBlockIndexRows.scriptId, payload.scriptId));

    if (payload.rows.length === 0) {
        return;
    }

    await db.insert(scriptBlockIndexRows).values(payload.rows.map(row => ({
        scriptId: row.scriptId,
        blockId: row.blockId,
        orderNo: row.orderNo,
        blockType: row.blockType,
        textContent: row.textContent,
        actBlockId: row.actBlockId,
        sceneBlockId: row.sceneBlockId,
        columnGroupOrder: row.columnGroupOrder,
        columnOrder: row.columnOrder,
        characterRefsJson: row.characterRefsJson,
        updatedAt: row.updatedAt,
    })));
};
