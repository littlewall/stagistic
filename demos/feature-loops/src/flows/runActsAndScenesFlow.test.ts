import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadFlow = () => import('./runActsAndScenesFlow');

describe('runActsAndScenesFlow', () => {
    it('creates a scene without changing the operator-positioned cursor', async () => {
        const {runActsAndScenesFlow} = await loadFlow();
        const events: unknown[] = [];

        await runActsAndScenesFlow({
            typeHuman: text => {
                events.push(['typeHuman', text]);

                return Promise.resolve();
            },
            typeBlock: text => {
                events.push(['typeBlock', text]);

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
            addAct: () => {
                events.push(['addAct']);

                return Promise.resolve();
            },
            waitForSecondAct: () => {
                events.push(['waitForSecondAct']);

                return Promise.resolve();
            },
            beginFirstSceneDrag: () => {
                events.push(['beginFirstSceneDrag']);

                return Promise.resolve();
            },
            moveFirstSceneOverSecondAct: () => {
                events.push(['moveFirstSceneOverSecondAct']);

                return Promise.resolve();
            },
            dropScene: () => {
                events.push(['dropScene']);

                return Promise.resolve();
            },
        });

        expect(events).toEqual([
            ['pause', 600],
            ['press', 'Enter'],
            ['press', 'Control+1'],
            ['typeHuman', 'THE CONSERVATORY'],
            ['press', 'Enter'],
            ['typeBlock', 'Vines climb the glass walls.'],
            ['pause', 280],
            ['press', 'Enter'],
            ['typeBlock', 'MARA'],
            ['pause', 280],
            ['press', 'Enter'],
            ['typeBlock', 'The air is warmer here.'],
            ['pause', 280],
            ['press', 'Enter'],
            ['typeBlock', 'JON'],
            ['pause', 280],
            ['press', 'Enter'],
            ['typeBlock', 'Then we have found the right place.'],
            ['pause', 1_000],
            ['addAct'],
            ['waitForSecondAct'],
            ['pause', 600],
            ['beginFirstSceneDrag'],
            ['moveFirstSceneOverSecondAct'],
            ['pause', 500],
            ['dropScene'],
            ['pause', 2_600],
        ]);
    });
});
