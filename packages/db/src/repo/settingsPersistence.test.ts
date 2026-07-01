import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createTestDb, seedScript} from '../testing/createTestDb';
import {createSettingsHandlers} from './config';
import {createTitlePageHandlers} from './titlePage';

describe('settings persistence', () => {
    it('round-trips categorized editor settings without JSON config storage', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 'script-settings');

        const handlers = createSettingsHandlers({
            getDb: () => Promise.resolve(db),
            recordOutbox: () => Promise.resolve(),
        });

        await handlers.saveScriptSettings('script-settings', {
            page: {marginTopPx: 72},
            typography: {fontSizePx: 16},
            visual: {characterColorSaturation: 42},
            headerFooter: {
                header: {
                    right: {
                        text: '{{page}}',
                        isBold: true,
                        isItalic: false,
                        isUnderline: false,
                        isHiddenInEditor: true,
                    },
                },
            },
            blocks: {dialogue: {isItalic: true}},
        });

        const stored = await handlers.loadScriptSettings('script-settings');

        expect(stored?.page?.marginTopPx).toBe(72);
        expect(stored?.visual?.characterColorSaturation).toBe(42);
        expect(stored?.headerFooter?.header?.right?.text).toBe('{{page}}');
        expect(stored?.headerFooter?.header?.right?.isHiddenInEditor).toBe(true);
        expect(stored?.blocks?.dialogue?.isItalic).toBe(true);
    });

    it('round-trips title page fields and credits', async () => {
        const {db} = await createTestDb();

        await seedScript(db, 'script-title-page');

        const handlers = createTitlePageHandlers({
            getDb: () => Promise.resolve(db),
            recordOutbox: () => Promise.resolve(),
        });

        await handlers.save('script-title-page', {
            titleOverride: 'The Test',
            credits: [{credit: 'Written by', authors: ['Ada', 'Grace']}],
        });

        const stored = await handlers.load('script-title-page');

        expect(stored?.titleOverride).toBe('The Test');
        expect(stored?.credits).toEqual([{credit: 'Written by', authors: ['Ada', 'Grace']}]);
    });
});
