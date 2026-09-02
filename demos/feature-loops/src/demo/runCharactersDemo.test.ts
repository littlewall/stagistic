import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadDemo = () => import('./runCharactersDemo');

describe('runCharactersDemo', () => {
    it('opens the seeded script in the real editor', async () => {
        const {runCharactersDemo} = await loadDemo();
        const events: string[] = [];

        const scriptId = await runCharactersDemo({
            seedScript: () => {
                events.push('seed');

                return Promise.resolve('characters-script');
            },
            navigate: path => {
                events.push(path);
            },
        });

        expect(scriptId).toBe('characters-script');
        expect(events).toEqual(['seed', '/script/characters-script/editor']);
    });
});
