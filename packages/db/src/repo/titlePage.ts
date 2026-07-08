import type {
    TitlePageCredit,
    TitlePageSettings,
} from '@stagistic/script';
import {uuidv7} from '@stagistic/shared';

import * as dbQueries from '../queries';
import type {ScriptTitlePageRepository} from '../scriptRepository';
import type {
    GetDb,
    RecordOutbox,
    SyncDb,
} from './types';

interface CreateTitlePageHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
    syncDb: SyncDb,
}

/*
 * `subtitle` is intentionally NOT here: it lives on the `scripts` table
 * (so the script list can read it without a join) and is bridged in
 * load()/save() below. The remaining fields live in scriptSettingsTitlePage.
 */
const STRING_FIELDS = [
    'source',
    'draftDateMode',
    'draftDate',
    'dateFormat',
    'contact',
    'copyright',
] as const;

type StringField = typeof STRING_FIELDS[number];

const isStringField = (value: string): value is StringField => STRING_FIELDS.includes(value as StringField);

const toTitlePageSettings = (
    rows: Awaited<ReturnType<typeof dbQueries.listScriptTitlePageFields>>,
): TitlePageSettings | null => {
    if (rows.length === 0) {
        return null;
    }

    const settings: TitlePageSettings = {};
    const credits = new Map<number, TitlePageCredit>();

    rows.forEach(row => {
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
        settings.credits = [...credits.entries()]
            .sort(([left], [right]) => left - right)
            .map(([, credit]) => credit);
    }

    return settings;
};

export const createTitlePageHandlers = ({
    getDb,
    recordOutbox,
    syncDb,
}: CreateTitlePageHandlersArgs): ScriptTitlePageRepository => {
    const load: ScriptTitlePageRepository['load'] = async scriptId => {
        const db = await getDb();
        const settings = toTitlePageSettings(await dbQueries.listScriptTitlePageFields(db, scriptId));
        const subtitle = await dbQueries.getScriptSubtitle(db, scriptId);

        if (subtitle === null || subtitle.length === 0) {
            return settings;
        }

        return {...settings, subtitle};
    };

    const save: ScriptTitlePageRepository['save'] = async (scriptId, settings) => {
        const db = await getDb();
        const now = Date.now();
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
        settings.credits?.forEach((credit, groupNo) => {
            addRow('credit_label', credit.credit, groupNo);
            credit.authors.forEach(author => addRow('credit_author', author, groupNo));
        });

        await dbQueries.replaceScriptTitlePageFields(db, scriptId, rows);

        const subtitle = typeof settings.subtitle === 'string' ? settings.subtitle.trim() : '';

        await dbQueries.updateScriptSubtitle(db, {
            id: scriptId,
            subtitle: subtitle.length > 0 ? subtitle : null,
            updatedAt: now,
        });
        await recordOutbox({
            scriptId,
            opType: 'title-page.save',
            payloadJson: JSON.stringify({scriptId, updatedAt: now}),
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

        await dbQueries.replaceScriptTitlePageFields(db, scriptId, []);
        await dbQueries.updateScriptSubtitle(db, {
            id: scriptId, subtitle: null, updatedAt: now,
        });
        await recordOutbox({
            scriptId,
            opType: 'title-page.delete',
            payloadJson: JSON.stringify({scriptId, deletedAt: now}),
        });

        await syncDb();
    };

    return {
        load, save, delete: deleteTitlePage,
    };
};
