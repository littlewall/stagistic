import {type FormatTemplateId, getFormatTemplate} from '@stagistic/script';
import {eq} from 'drizzle-orm';

import {type DbClient, invalidateScriptPageCount} from '../../queries';
import {scripts} from '../../schema';

export const readScriptFormatTemplateId = async (db: DbClient, scriptId: string): Promise<FormatTemplateId | null> => {
    const [row] = await db.select({id: scripts.formatTemplateId}).from(scripts).where(eq(scripts.id, scriptId));

    return row?.id ?? null;
};

export const setScriptFormatTemplateId = async (db: DbClient, scriptId: string, id: FormatTemplateId | null, now: number) => {
    if (id !== null && !getFormatTemplate(id)) throw new Error(`Unknown format template: ${id}`);

    await db.update(scripts).set({formatTemplateId: id, updatedAt: now}).where(eq(scripts.id, scriptId));
    await invalidateScriptPageCount(db, scriptId);
};
