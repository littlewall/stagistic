import {describe, expect, it} from 'vite-plus/test';

import {createTestDb, seedScript} from '../testing/createTestDb';
import {readScriptSettings, writeScriptSettingsTx} from './config';
import {readTitlePageSettings, writeTitlePageFieldsTx} from './titlePage';

describe('tx-level package section writers', () => {
    it('writes title page and settings inside a caller transaction', async () => {
        const {db} = await createTestDb();
        await seedScript(db, 'sc1');

        await db.transaction(async tx => {
            await writeTitlePageFieldsTx(tx, 'sc1', {source: 'Original story', subtitle: 'A play'}, 1_000);
            await writeScriptSettingsTx(tx, 'sc1', {visual: {characterColorSaturation: 0.5}}, 1_000);
        });

        expect(await readTitlePageSettings(db, 'sc1')).toMatchObject({source: 'Original story', subtitle: 'A play'});
        expect(await readScriptSettings(db, 'sc1')).toMatchObject({visual: {characterColorSaturation: 0.5}});
    });
});
