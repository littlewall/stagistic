import {
    asc,
    eq,
} from 'drizzle-orm';

import {
    scriptCueSheetAnnotations,
    scriptCueSheets,
} from '../../schema';
import type {DbClient} from '../types';

export interface UpsertScriptCueSheetPayload {
    id: string,
    scriptId: string,
    layerId: string,
    name: string,
    cueOrderJson: string,
    createdAt: number,
    updatedAt: number,
}

export interface ScriptCueSheetAnnotationRow {
    annotationId: string,
    orderNo: number,
    notes: string | null,
    createdAt: number,
    updatedAt: number,
}

export const listScriptCueSheets = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptCueSheets)
        .where(eq(scriptCueSheets.scriptId, scriptId))
        .orderBy(asc(scriptCueSheets.name));
};

export const upsertScriptCueSheet = async (
    db: DbClient,
    payload: UpsertScriptCueSheetPayload,
) => {
    await db
        .insert(scriptCueSheets)
        .values({
            id: payload.id,
            scriptId: payload.scriptId,
            layerId: payload.layerId,
            name: payload.name,
            cueOrderJson: payload.cueOrderJson,
            createdAt: payload.createdAt,
            updatedAt: payload.updatedAt,
        })
        .onConflictDoUpdate({
            target: scriptCueSheets.id,
            set: {
                layerId: payload.layerId,
                name: payload.name,
                cueOrderJson: payload.cueOrderJson,
                updatedAt: payload.updatedAt,
            },
        });
};

export const deleteScriptCueSheet = async (db: DbClient, cueSheetId: string) => {
    await db
        .delete(scriptCueSheets)
        .where(eq(scriptCueSheets.id, cueSheetId));
};

export const listScriptCueSheetAnnotations = async (db: DbClient, cueSheetId: string) => {
    return db
        .select()
        .from(scriptCueSheetAnnotations)
        .where(eq(scriptCueSheetAnnotations.cueSheetId, cueSheetId))
        .orderBy(asc(scriptCueSheetAnnotations.orderNo));
};

export const replaceScriptCueSheetAnnotations = async (
    db: DbClient,
    cueSheetId: string,
    rows: ScriptCueSheetAnnotationRow[],
) => {
    await db
        .delete(scriptCueSheetAnnotations)
        .where(eq(scriptCueSheetAnnotations.cueSheetId, cueSheetId));

    if (rows.length === 0) {
        return;
    }

    await db.insert(scriptCueSheetAnnotations).values(rows.map(row => ({
        cueSheetId,
        annotationId: row.annotationId,
        orderNo: row.orderNo,
        notes: row.notes,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    })));
};
