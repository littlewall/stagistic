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
            typeWordGroups: async groups => {
                events.push(['typeWordGroups', groups]);
            },
            typeHuman: async text => {
                events.push(['typeHuman', text]);
            },
            press: async key => {
                events.push(['press', key]);
            },
            pause: async durationMs => {
                events.push(['pause', durationMs]);
            },
            waitForBlock: async blockType => {
                events.push(['waitForBlock', blockType]);
            },
            waitForSuggestions: async () => {
                events.push(['waitForSuggestions']);
            },
            waitForMusicPill: async () => {
                events.push(['waitForMusicPill']);
            },
        });

        expect(events).toEqual([
            ['typeWordGroups', ['THE', ' ROOFTOP']],
            ['press', 'Enter'],
            ['waitForBlock', 'stageDirection'],
            ['typeWordGroups', ['A storm', ' gathers.']],
            ['press', 'Enter'],
            ['press', 'Alt+Enter'],
            ['waitForBlock', 'character'],
            ['typeHuman', 'MAR'],
            ['waitForSuggestions'],
            ['pause', 280],
            ['press', 'ArrowDown'],
            ['pause', 180],
            ['press', 'Enter'],
            ['press', 'Enter'],
            ['waitForBlock', 'dialogue'],
            ['typeHuman', 'Wait.'],
            ['press', 'Enter'],
            ['waitForBlock', 'character'],
            ['typeHuman', 'EL'],
            ['waitForSuggestions'],
            ['pause', 280],
            ['press', 'ArrowDown'],
            ['pause', 180],
            ['press', 'Enter'],
            ['press', 'Enter'],
            ['waitForBlock', 'dialogue'],
            ['press', 'Control+4'],
            ['waitForBlock', 'aside'],
            ['typeHuman', '(softly)'],
            ['press', 'Enter'],
            ['waitForBlock', 'dialogue'],
            ['press', 'Control+7'],
            ['waitForBlock', 'lyrics'],
            ['typeHuman', 'WE RISE'],
            ['press', 'Enter'],
            ['waitForBlock', 'lyrics'],
            ['press', 'Control+2'],
            ['waitForBlock', 'stageDirection'],
            ['typeWordGroups', ['The light', ' spills.']],
            ['typeWordGroups', ['#']],
            ['typeHuman', 'Dawn'],
            ['press', 'Enter'],
            ['waitForMusicPill'],
            ['pause', 1_400],
        ]);
    });
});
