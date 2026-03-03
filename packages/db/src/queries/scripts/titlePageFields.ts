import {
    asc,
    eq,
} from 'drizzle-orm';

import {scriptTitlePageFields} from '../../schema';
import type {DbClient} from '../types';

export interface ScriptTitlePageFieldRow {
    id: string,
    fieldKey: string,
    fieldValue: string,
    orderNo: number,
    createdAt: number,
    updatedAt: number,
}

export const listScriptTitlePageFields = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptTitlePageFields)
        .where(eq(scriptTitlePageFields.scriptId, scriptId))
        .orderBy(asc(scriptTitlePageFields.orderNo));
};

export const replaceScriptTitlePageFields = async (
    db: DbClient,
    scriptId: string,
    rows: ScriptTitlePageFieldRow[],
) => {
    await db
        .delete(scriptTitlePageFields)
        .where(eq(scriptTitlePageFields.scriptId, scriptId));

    if (rows.length === 0) {
        return;
    }

    await db.insert(scriptTitlePageFields).values(rows.map(row => ({
        id: row.id,
        scriptId,
        fieldKey: row.fieldKey,
        fieldValue: row.fieldValue,
        orderNo: row.orderNo,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    })));
};
