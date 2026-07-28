import {
    asc,
    eq,
} from 'drizzle-orm';

import {scriptSettingsTitlePage} from '../../schema';
import type {DbClient} from '../types';

export interface ScriptTitlePageFieldRow {
    id: string,
    fieldKey: string,
    fieldValue: string,
    groupNo?: number | null,
    orderNo: number,
    createdAt: number,
    updatedAt: number,
}

export const listScriptTitlePageFields = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptSettingsTitlePage)
        .where(eq(scriptSettingsTitlePage.scriptId, scriptId))
        .orderBy(asc(scriptSettingsTitlePage.orderNo));
};

export const replaceScriptTitlePageFields = async (
    db: DbClient,
    scriptId: string,
    rows: ScriptTitlePageFieldRow[],
) => {
    await db
        .delete(scriptSettingsTitlePage)
        .where(eq(scriptSettingsTitlePage.scriptId, scriptId));

    if (rows.length === 0) {
        return;
    }

    await db.insert(scriptSettingsTitlePage).values(rows.map(row => ({
        id: row.id,
        scriptId,
        fieldKey: row.fieldKey,
        fieldValue: row.fieldValue,
        groupNo: row.groupNo ?? null,
        orderNo: row.orderNo,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    })));
};
