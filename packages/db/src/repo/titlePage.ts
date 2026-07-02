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
} from './types';

interface CreateTitlePageHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
}

const STRING_FIELDS = [
    'subtitle',
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
}: CreateTitlePageHandlersArgs): ScriptTitlePageRepository => {
    const load: ScriptTitlePageRepository['load'] = async scriptId => {
        const db = await getDb();

        return toTitlePageSettings(await dbQueries.listScriptTitlePageFields(db, scriptId));
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
        await recordOutbox({
            scriptId,
            opType: 'title-page.save',
            payloadJson: JSON.stringify({scriptId, updatedAt: now}),
        });
    };

    const deleteTitlePage: ScriptTitlePageRepository['delete'] = async scriptId => {
        const db = await getDb();

        await dbQueries.replaceScriptTitlePageFields(db, scriptId, []);
        await recordOutbox({
            scriptId,
            opType: 'title-page.delete',
            payloadJson: JSON.stringify({scriptId, deletedAt: Date.now()}),
        });
    };

    return {
        load, save, delete: deleteTitlePage,
    };
};
