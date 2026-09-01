import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadDemo = () => import('./runActsAndScenesDemo');

describe('runActsAndScenesDemo', () => {
    it('waits for the prepared script before opening its real editor route', async () => {
        const {runActsAndScenesDemo} = await loadDemo();
        const events: string[] = [];

        const scriptId = await runActsAndScenesDemo({
            seedScript: () => {
                events.push('seed');

                return Promise.resolve('script-456');
            },
            navigate: path => {
                events.push(path);
            },
        });

        expect(scriptId).toBe('script-456');
        expect(events).toEqual(['seed', '/script/script-456/editor']);
    });
});
