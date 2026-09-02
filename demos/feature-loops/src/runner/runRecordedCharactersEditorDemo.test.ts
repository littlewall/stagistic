import type {Page} from 'playwright';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadRunner = () => import('./runRecordedCharactersEditorDemo');

describe('runRecordedCharactersEditorDemo', () => {
    it('holds the editor for Recordly before playing the character sequence', async () => {
        const {runRecordedCharactersEditorDemo} = await loadRunner();
        const events: unknown[] = [];

        await runRecordedCharactersEditorDemo({
            page: {
                addInitScript: () => Promise.resolve(),
                goto: () => Promise.resolve(),
                waitForURL: () => Promise.resolve(),
                getByRole: () => ({focus: () => Promise.resolve()}),
            } as unknown as Pick<Page, 'addInitScript' | 'goto' | 'waitForURL' | 'getByRole'>,
            driver: {
                typeHuman: () => {
                    events.push('flow');

                    return Promise.resolve();
                },
                press: () => Promise.resolve(),
                pause: durationMs => {
                    events.push(['pause', durationMs]);

                    return Promise.resolve();
                },
                moveToBlock: () => Promise.resolve(),
                confirmUnconfirmedCharacter: () => Promise.resolve(),
                waitForSuggestions: () => Promise.resolve(),
            },
            baseUrl: 'http://localhost:3000',
            waitForOperator: prompt => {
                events.push(['operator', prompt]);

                return Promise.resolve();
            },
            log: message => events.push(['log', message]),
        });

        expect(events.slice(0, 3)).toEqual([
            ['log', 'Ready for Recordly. Start recording, then press Enter here.'],
            ['operator', 'Start flow'],
            ['pause', 900],
        ]);
        expect(events).toContain('flow');
        expect(events).toContainEqual(['pause', 1_400]);
        expect(events.at(-2)).toEqual(['log', 'Flow complete. Stop Recordly, then press Enter to close the browser.']);
        expect(events.at(-1)).toEqual(['operator', 'Close browser']);
    });
});
