import {
    describe, expect, it, vi,
} from 'vite-plus/test';

import {importStagisticFile} from './importStagisticFile';

describe('importStagisticFile', () => {
    it('creates a script and persists imported title-page settings', async () => {
        const createScript = vi.fn(async () => 'script-1');
        const saveTitlePage = vi.fn(async () => {});
        const rollbackScript = vi.fn(async () => {});

        const result = await importStagisticFile({
            fileName: 'night.stagistic',
            name: '',
            text: `---
title: When Night Falls
draftDate: 2026-07-01
---
# Scene
`,
            createScript,
            saveTitlePage,
            rollbackScript,
        });

        expect(result).toEqual({scriptId: 'script-1', scriptName: 'When Night Falls'});
        expect(createScript).toHaveBeenCalledWith(
            'When Night Falls',
            expect.objectContaining({type: 'doc'}),
        );
        expect(saveTitlePage).toHaveBeenCalledWith('script-1', expect.objectContaining({
            draftDate: '2026-07-01',
        }));
        expect(rollbackScript).not.toHaveBeenCalled();
    });

    it('rolls back the created script when title-page persistence fails', async () => {
        const failure = new Error('Storage failed');
        const rollbackScript = vi.fn(async () => {});

        await expect(importStagisticFile({
            fileName: 'night.stagistic',
            name: 'Night',
            text: `---
title: Night
subtitle: A play
---
# Scene
`,
            createScript: async () => 'script-2',
            saveTitlePage: async () => Promise.reject(failure),
            rollbackScript,
        })).rejects.toThrow('Storage failed');
        expect(rollbackScript).toHaveBeenCalledWith('script-2');
    });

    it('rejects other file extensions before creating anything', async () => {
        const createScript = vi.fn(async () => 'script-3');

        await expect(importStagisticFile({
            fileName: 'night.fountain',
            name: 'Night',
            text: '# Scene',
            createScript,
            saveTitlePage: async () => {},
            rollbackScript: async () => {},
        })).rejects.toThrow('Only .stagistic files are supported.');
        expect(createScript).not.toHaveBeenCalled();
    });
});
