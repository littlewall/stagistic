import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const loadDemo = () => import('./runEditorBlocksDemo');

describe('runEditorBlocksDemo', () => {
    it('waits for the demo script before opening its real editor route', async () => {
        const {runEditorBlocksDemo} = await loadDemo();
        const events: string[] = [];

        const scriptId = await runEditorBlocksDemo({
            seedScript: () => {
                events.push('seed');

                return Promise.resolve('script-123');
            },
            navigate: path => {
                events.push(path);
            },
        });

        expect(scriptId).toBe('script-123');
        expect(events).toEqual(['seed', '/script/script-123/editor']);
    });
});
