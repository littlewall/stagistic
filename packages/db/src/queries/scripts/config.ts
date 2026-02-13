import {and, eq} from 'drizzle-orm';

import {
    scriptConfigBlocks,
    scriptConfigs,
} from '../../schema';
import type {DbClient} from '../types';

export const getScriptConfigMeta = async (
    db: DbClient,
    payload: {scriptId: string, namespace: string},
) => {
    const rows = await db
        .select()
        .from(scriptConfigs)
        .where(and(
            eq(scriptConfigs.scriptId, payload.scriptId),
            eq(scriptConfigs.namespace, payload.namespace),
        ))
        .limit(1);

    return rows[0] ?? null;
};

export const insertScriptConfig = async (db: DbClient, payload: {
    id: string,
    scriptId: string,
    namespace: string,
    payloadJson: string | null,
    createdAt: number,
    updatedAt: number,
    schemaVersion: number,
}) => {
    await db.insert(scriptConfigs).values({
        id: payload.id,
        scriptId: payload.scriptId,
        namespace: payload.namespace,
        payloadJson: payload.payloadJson,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
        schemaVersion: payload.schemaVersion,
    });
};

export const updateScriptConfig = async (db: DbClient, payload: {
    id: string,
    payloadJson: string | null,
    updatedAt: number,
    schemaVersion: number,
}) => {
    await db
        .update(scriptConfigs)
        .set({
            payloadJson: payload.payloadJson,
            updatedAt: payload.updatedAt,
            schemaVersion: payload.schemaVersion,
        })
        .where(eq(scriptConfigs.id, payload.id));
};

export const deleteScriptConfig = async (db: DbClient, payload: {
    scriptId: string,
    namespace: string,
}) => {
    await db
        .delete(scriptConfigs)
        .where(and(
            eq(scriptConfigs.scriptId, payload.scriptId),
            eq(scriptConfigs.namespace, payload.namespace),
        ));
};

export const listScriptConfigBlocks = async (db: DbClient, configId: string) => {
    return db
        .select()
        .from(scriptConfigBlocks)
        .where(eq(scriptConfigBlocks.configId, configId));
};

export const replaceScriptConfigBlocks = async (db: DbClient, payload: {
    configId: string,
    rows: Array<{
        id: string,
        blockType: string,
        spacingBeforeMillis: number | null,
        lineHeightMillis: number | null,
        indentLeftChars: number | null,
        indentRightChars: number | null,
        shortcut: string | null,
        nextElement: string | null,
        textAlign: string | null,
        casing: string | null,
        isBold: boolean | null,
        isItalic: boolean | null,
        isUnderline: boolean | null,
        createdAt: number,
        updatedAt: number,
    }>,
}) => {
    await db.delete(scriptConfigBlocks).where(eq(scriptConfigBlocks.configId, payload.configId));

    if (payload.rows.length === 0) {
        return;
    }

    await db.insert(scriptConfigBlocks).values(payload.rows.map(row => ({
        id: row.id,
        configId: payload.configId,
        blockType: row.blockType,
        spacingBeforeMillis: row.spacingBeforeMillis,
        lineHeightMillis: row.lineHeightMillis,
        indentLeftChars: row.indentLeftChars,
        indentRightChars: row.indentRightChars,
        shortcut: row.shortcut,
        nextElement: row.nextElement,
        textAlign: row.textAlign,
        casing: row.casing,
        isBold: row.isBold,
        isItalic: row.isItalic,
        isUnderline: row.isUnderline,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    })));
};
