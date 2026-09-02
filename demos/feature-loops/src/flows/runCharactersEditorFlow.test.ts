import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadFlow = () => import('./runCharactersEditorFlow');

describe('runCharactersEditorFlow', () => {
    it('confirms Warden before writing solo, shared, group, and tagged lines', async () => {
        const {runCharactersEditorFlow} = await loadFlow();
        const events: unknown[] = [];

        await runCharactersEditorFlow({
            typeHuman: text => {
                events.push(['typeHuman', text]);

                return Promise.resolve();
            },
            press: key => {
                events.push(['press', key]);

                return Promise.resolve();
            },
            pause: durationMs => {
                events.push(['pause', durationMs]);

                return Promise.resolve();
            },
            moveToBlock: blockId => {
                events.push(['moveToBlock', blockId]);

                return Promise.resolve();
            },
            confirmUnconfirmedCharacter: characterKey => {
                events.push(['confirmUnconfirmedCharacter', characterKey]);

                return Promise.resolve();
            },
            waitForSuggestions: () => {
                events.push(['waitForSuggestions']);

                return Promise.resolve();
            },
        });

        expect(events).toEqual([
            ['moveToBlock', 'demo-characters-unconfirmed'],
            ['typeHuman', 'WARDEN'],
            ['moveToBlock', 'demo-characters-warden-dialogue'],
            ['typeHuman', 'The gate is secure.'],
            ['confirmUnconfirmedCharacter', 'WARDEN'],
            ['pause', 650],
            ['moveToBlock', 'demo-characters-mara'],
            ['typeHuman', 'MAR'],
            ['waitForSuggestions'],
            ['pause', 280],
            ['press', 'ArrowDown'],
            ['pause', 180],
            ['press', 'Enter'],
            ['moveToBlock', 'demo-characters-mara-dialogue'],
            ['typeHuman', 'Keep the beacon lit.'],
            ['moveToBlock', 'demo-characters-together'],
            ['typeHuman', 'MAR'],
            ['waitForSuggestions'],
            ['pause', 280],
            ['press', 'ArrowDown'],
            ['pause', 180],
            ['press', 'Enter'],
            ['typeHuman', '/'],
            ['typeHuman', 'EL'],
            ['waitForSuggestions'],
            ['pause', 280],
            ['press', 'ArrowDown'],
            ['pause', 180],
            ['press', 'Enter'],
            ['moveToBlock', 'demo-characters-together-dialogue'],
            ['typeHuman', 'Together, we hold the line.'],
            ['moveToBlock', 'demo-characters-watch'],
            ['typeHuman', 'THE'],
            ['waitForSuggestions'],
            ['pause', 280],
            ['press', 'ArrowDown'],
            ['pause', 180],
            ['press', 'Enter'],
            ['moveToBlock', 'demo-characters-watch-dialogue'],
            ['typeHuman', 'We stand watch until dawn.'],
            ['moveToBlock', 'demo-characters-tagged-direction'],
            ['typeHuman', '@MAR'],
            ['waitForSuggestions'],
            ['pause', 280],
            ['press', 'ArrowDown'],
            ['pause', 180],
            ['press', 'Enter'],
            ['pause', 180],
            ['press', 'Enter'],
            ['typeHuman', 'seals the observatory doors.'],
            ['pause', 1_400],
        ]);
    });
});
