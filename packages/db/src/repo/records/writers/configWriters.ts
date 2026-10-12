import {SCRIPT_RECORD_ID} from '@stagistic/sync-engine';

import * as dbQueries from '../../../queries';
import {writeScriptSettingsTx} from '../../config/config';
import {writeTitlePageFieldsTx} from '../../config/titlePage';
import {type Upserts, type WriteContext} from './shared';

export const writeSettings = async ({
    tx,
    scriptId,
    now,
}: WriteContext, upserts: Upserts) => {
    if (!(SCRIPT_RECORD_ID in upserts)) {
        return;
    }

    const record = upserts[SCRIPT_RECORD_ID];

    if (record) {
        await writeScriptSettingsTx(tx, scriptId, record, now);
    } else {
        await dbQueries.deleteScriptSettings(tx, scriptId);
        await dbQueries.invalidateScriptPageCount(tx, scriptId);
    }
};

export const writeTitlePage = async ({
    tx,
    scriptId,
    now,
}: WriteContext, upserts: Upserts) => {
    if (!(SCRIPT_RECORD_ID in upserts)) {
        return;
    }

    const record = upserts[SCRIPT_RECORD_ID];

    // The title page owns the subtitle column too; the `script` record follows it.
    if (record) {
        await writeTitlePageFieldsTx(tx, scriptId, record, now);
    } else {
        await dbQueries.replaceScriptTitlePageFields(tx, scriptId, []);
    }
};
