import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadFlow = () => import('./runCharactersAttributesFlow');

describe('runCharactersAttributesFlow', () => {
    it('adds both characters before applying the contrasting red group color', async () => {
        const {runCharactersAttributesFlow} = await loadFlow();
        const events: unknown[] = [];

        await runCharactersAttributesFlow({
            focusMembers: () => {
                events.push(['focusMembers']);

                return Promise.resolve();
            },
            typeHuman: text => {
                events.push(['typeHuman', text]);

                return Promise.resolve();
            },
            selectMember: name => {
                events.push(['selectMember', name]);

                return Promise.resolve();
            },
            openColorPicker: () => {
                events.push(['openColorPicker']);

                return Promise.resolve();
            },
            selectColorPreset: index => {
                events.push(['selectColorPreset', index]);

                return Promise.resolve();
            },
            applyColor: () => {
                events.push(['applyColor']);

                return Promise.resolve();
            },
            pause: durationMs => {
                events.push(['pause', durationMs]);

                return Promise.resolve();
            },
        });

        expect(events).toEqual([
            ['focusMembers'],
            ['typeHuman', 'MAR'],
            ['pause', 320],
            ['selectMember', 'MARA'],
            ['pause', 260],
            ['focusMembers'],
            ['typeHuman', 'EL'],
            ['pause', 320],
            ['selectMember', 'ELI'],
            ['pause', 320],
            ['openColorPicker'],
            ['pause', 380],
            ['selectColorPreset', 1],
            ['pause', 240],
            ['applyColor'],
            ['pause', 1_400],
        ]);
    });
});
