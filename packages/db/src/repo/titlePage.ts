import type {TitlePageCredit, TitlePageLogo, TitlePageSettings} from '@stagistic/script';
import {uuidv7} from '@stagistic/shared';

import * as dbQueries from '../queries';
import type {DbClient} from '../queries';
import type {ScriptTitlePageRepository} from '../scriptRepository';
import type {GetDb, RecordOutbox, SyncDb} from './types';

interface CreateTitlePageHandlersArgs {
    getDb: GetDb;
    recordOutbox: RecordOutbox;
    syncDb: SyncDb;
}

/*
 * `subtitle` is intentionally NOT here: it lives on the `scripts` table
 * (so the script list can read it without a join) and is bridged in
 * load()/save() below. The remaining fields live in scriptSettingsTitlePage.
 */
const STRING_FIELDS = ['source', 'draftDateMode', 'draftDate', 'dateFormat', 'contact', 'copyright'] as const;
const LOGO_FIELD = 'logo';

type StringField = (typeof STRING_FIELDS)[number];

const isStringField = (value: string): value is StringField => STRING_FIELDS.includes(value as StringField);

const parseLogo = (value: string): TitlePageLogo | undefined => {
    try {
        return JSON.parse(value) as TitlePageLogo;
    } catch {
        return undefined;
    }
};

export const toTitlePageSettings = (rows: Awaited<ReturnType<typeof dbQueries.listScriptTitlePageFields>>): TitlePageSettings | null => {
    if (rows.length === 0) {
        return null;
    }

    const settings: TitlePageSettings = {};
    const credits = new Map<number, TitlePageCredit>();

    rows.forEach(row => {
        if (row.fieldKey === LOGO_FIELD) {
            settings.logo = parseLogo(row.fieldValue);

            return;
        }

        if (isStringField(row.fieldKey)) {
            Object.assign(settings, {[row.fieldKey]: row.fieldValue});

            return;
        }

        if (row.groupNo === null || (row.fieldKey !== 'credit_label' && row.fieldKey !== 'credit_author')) {
            return;
        }

        const credit = credits.get(row.groupNo) ?? {credit: '', authors: []};

        if (row.fieldKey === 'credit_label') {
            credit.credit = row.fieldValue;
        } else {
            credit.authors.push(row.fieldValue);
        }

        credits.set(row.groupNo, credit);
    });

    if (credits.size > 0) {
        settings.credits = [...credits.entries()].sort(([left], [right]) => left - right).map(([, credit]) => credit);
    }

    return settings;
};

export const readTitlePageSettings = async (db: DbClient, scriptId: string): Promise<TitlePageSettings | null> => {
    const settings = toTitlePageSettings(await dbQueries.listScriptTitlePageFields(db, scriptId));
    const subtitle = await dbQueries.getScriptSubtitle(db, scriptId);
    return subtitle === null || subtitle.length === 0 ? settings : {...settings, subtitle};
};

export const writeTitlePageFieldsTx = async (tx: DbClient, scriptId: string, settings: TitlePageSettings, now: number): Promise<void> => {
    let orderNo = 0;
    const rows: dbQueries.ScriptTitlePageFieldRow[] = [];
    const addRow = (fieldKey: string, fieldValue: string, groupNo: number | null = null) => {
        rows.push({
            id: uuidv7(),
            fieldKey,
            fieldValue,
            groupNo,
            orderNo,
            createdAt: now,
            updatedAt: now,
        });
        orderNo += 1;
    };

    STRING_FIELDS.forEach(fieldKey => {
        const value = settings[fieldKey];

        if (typeof value === 'string' && value.length > 0) {
            addRow(fieldKey, value);
        }
    });
    if (settings.logo) {
        addRow(LOGO_FIELD, JSON.stringify(settings.logo));
    }
    settings.credits?.forEach((credit, groupNo) => {
        addRow('credit_label', credit.credit, groupNo);
        credit.authors.forEach(author => addRow('credit_author', author, groupNo));
    });

    const subtitle = typeof settings.subtitle === 'string' ? settings.subtitle.trim() : '';

    await dbQueries.replaceScriptTitlePageFields(tx, scriptId, rows);
    await dbQueries.updateScriptSubtitle(tx, {
        id: scriptId,
        subtitle: subtitle.length > 0 ? subtitle : null,
        updatedAt: now,
    });
};

export const createTitlePageHandlers = ({getDb, recordOutbox, syncDb}: CreateTitlePageHandlersArgs): ScriptTitlePageRepository => {
    const load: ScriptTitlePageRepository['load'] = async scriptId => {
        const db = await getDb();
        return readTitlePageSettings(db, scriptId);
    };

    const save: ScriptTitlePageRepository['save'] = async (scriptId, settings) => {
        const db = await getDb();
        const now = Date.now();

        await db.transaction(async tx => {
            await writeTitlePageFieldsTx(tx, scriptId, settings, now);
            await recordOutbox(
                {
                    scriptId,
                    entityKey: `script:${scriptId}:title-page`,
                    opType: 'title-page.save',
                    occurredAt: now,
                    payloadJson: JSON.stringify({scriptId, updatedAt: now}),
                },
                tx,
            );
        });

        /*
         * Flush the in-memory PGlite WAL to the filesystem; without this the
         * write is lost on page refresh (see content.ts saveLatest).
         */
        await syncDb();
    };

    const deleteTitlePage: ScriptTitlePageRepository['delete'] = async scriptId => {
        const db = await getDb();
        const now = Date.now();

        await db.transaction(async tx => {
            await dbQueries.replaceScriptTitlePageFields(tx, scriptId, []);
            await dbQueries.updateScriptSubtitle(tx, {
                id: scriptId,
                subtitle: null,
                updatedAt: now,
            });
            await recordOutbox(
                {
                    scriptId,
                    entityKey: `script:${scriptId}:title-page`,
                    opType: 'title-page.delete',
                    occurredAt: now,
                    payloadJson: JSON.stringify({scriptId, deletedAt: now}),
                },
                tx,
            );
        });

        await syncDb();
    };

    return {
        load,
        save,
        delete: deleteTitlePage,
    };
};
