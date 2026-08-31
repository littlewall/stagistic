import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadFlow = () => import('./runEditorBlocksFlow');

describe('runEditorBlocksFlow', () => {
    it('writes the approved block sequence through real keyboard-oriented driver actions', async () => {
        const {runEditorBlocksFlow} = await loadFlow();
        const events: unknown[] = [];

        await runEditorBlocksFlow({
            typeWordGroups: groups => {
                events.push(['typeWordGroups', groups]);

                return Promise.resolve();
            },
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
            waitForSuggestions: () => {
                events.push(['waitForSuggestions']);

                return Promise.resolve();
            },
            waitForMusicPill: () => {
                events.push(['waitForMusicPill']);

                return Promise.resolve();
            },
        });

        expect(events).toEqual([
            ['typeWordGroups', ['THE', ' ROOFTOP']],
            ['moveToBlock', 'demo-stage-direction-1'],
            ['typeWordGroups', ['A storm gathers', ' over the silent city.']],
            ['moveToBlock', 'demo-character-block-1'],
            ['typeHuman', 'MAR'],
            ['waitForSuggestions'],
            ['pause', 280],
            ['press', 'ArrowDown'],
            ['pause', 180],
            ['press', 'Enter'],
            ['moveToBlock', 'demo-dialogue'],
            ['typeHuman', 'Wait. The storm is almost here.'],
            ['moveToBlock', 'demo-character-block-2'],
            ['typeHuman', 'EL'],
            ['waitForSuggestions'],
            ['pause', 280],
            ['press', 'ArrowDown'],
            ['pause', 180],
            ['press', 'Enter'],
            ['moveToBlock', 'demo-aside'],
            ['pause', 300],
            ['typeWordGroups', ['softly']],
            ['pause', 120],
            ['moveToBlock', 'demo-lyrics'],
            ['typeHuman', 'WE RISE'],
            ['moveToBlock', 'demo-lyrics-2'],
            ['typeHuman', 'WITH THE DAWN'],
            ['moveToBlock', 'demo-stage-direction-2'],
            ['typeWordGroups', ['First light spills', ' over the rooftop.']],
            ['typeWordGroups', ['#']],
            ['typeHuman', 'Dawn in Gold'],
            ['press', 'Enter'],
            ['waitForMusicPill'],
            ['pause', 1_400],
        ]);
    });
});
