import type {Page} from 'playwright';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadRunner = () => import('./runRecordedCharactersAttributesDemo');

describe('runRecordedCharactersAttributesDemo', () => {
    it('prepares the selected group before holding for Recordly', async () => {
        const {runRecordedCharactersAttributesDemo} = await loadRunner();
        const events: unknown[] = [];

        await runRecordedCharactersAttributesDemo({
            page: {
                addInitScript: () => Promise.resolve(),
                goto: () => Promise.resolve(),
                waitForURL: () => Promise.resolve(),
                getByRole: (_role: string, options: {name?: string}) => ({
                    focus: () => Promise.resolve(),
                    click: () => {
                        events.push(['click', options.name]);

                        return Promise.resolve();
                    },
                }),
                locator: () => ({
                    getByRole: () => ({
                        click: () => {
                            events.push(['clickGroup']);

                            return Promise.resolve();
                        },
                    }),
                }),
            } as unknown as Pick<Page, 'addInitScript' | 'goto' | 'waitForURL' | 'getByRole' | 'locator'>,
            driver: {
                focusMembers: () => Promise.resolve(),
                typeHuman: () => {
                    events.push('flow');

                    return Promise.resolve();
                },
                selectMember: () => Promise.resolve(),
                openColorPicker: () => Promise.resolve(),
                selectColorPreset: () => Promise.resolve(),
                applyColor: () => Promise.resolve(),
                pause: durationMs => {
                    events.push(['pause', durationMs]);

                    return Promise.resolve();
                },
            },
            baseUrl: 'http://localhost:3000',
            waitForOperator: prompt => {
                events.push(['operator', prompt]);

                return Promise.resolve();
            },
            log: message => events.push(['log', message]),
        });

        expect(events.slice(0, 4)).toEqual([
            ['click', 'Open characters in attribute manager'],
            ['click', 'Groups'],
            ['clickGroup'],
            ['log', 'Ready for Recordly. Start recording, then press Enter here.'],
        ]);
        expect(events).toContainEqual(['operator', 'Start flow']);
        expect(events).toContain('flow');
        expect(events).toContainEqual(['pause', 1_400]);
        expect(events.at(-2)).toEqual(['log', 'Flow complete. Stop Recordly, then press Enter to close the browser.']);
        expect(events.at(-1)).toEqual(['operator', 'Close browser']);
    });
});
