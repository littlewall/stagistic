import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    cleanupFixtures,
    longDocument,
    paginationStorage,
    renderFixture,
    shortDocument,
    type Snapshot,
    waitFor,
} from './useEditorAutosaveFixtures';

afterEach(cleanupFixtures);

describe('useEditorAutosave pagination snapshots', () => {
    it('retries a current measurement after delayed settings persistence without another layout event', async () => {
        let attempts = 0;
        let settingsPersisted = false;
        const {editor} = await renderFixture(() => true, undefined, () => {
            attempts += 1;

            return settingsPersisted;
        });

        expect(attempts).toBe(1);
        settingsPersisted = true;
        await waitFor(() => attempts === 2);
        paginationStorage(editor).flushRecalc?.();
        expect(attempts).toBe(2);
    });

    it('stops retrying a persistently rejected measurement after three attempts', async () => {
        let attempts = 0;

        await renderFixture(() => true, undefined, () => {
            attempts += 1;

            return false;
        });

        await waitFor(() => attempts === 3);
        await new Promise(resolve => window.setTimeout(resolve, 600));
        expect(attempts).toBe(3);
    });

    it('retains a full measurement when saving the same document after its view detaches', async () => {
        const saved: Snapshot[] = [];
        const {editor, controller} = await renderFixture((value, metadata) => {
            saved.push({value, metadata});

            return true;
        }, undefined, undefined, longDocument());
        const measuredPages = paginationStorage(editor).state.pageCount;

        expect(measuredPages).toBeGreaterThan(1);
        editor.view.dom.remove();
        controller.scheduleAutosave({revision: 1, immediate: true});

        expect(saved[0].metadata?.pageCount).toBe(measuredPages);
    });

    it('saves unknown total pages while a scene is collapsed and skips viewport metadata refreshes', async () => {
        const refreshed: Snapshot[] = [];
        const saved: Snapshot[] = [];
        const {editor, controller} = await renderFixture((value, metadata) => {
            saved.push({value, metadata});

            return true;
        }, undefined, (value, metadata) => {
            refreshed.push({value, metadata});
        }, longDocument());

        await waitFor(() => refreshed.length === 1);
        editor.commands.toggleSceneCollapsed('scene-one');
        paginationStorage(editor).flushRecalc?.();
        controller.scheduleAutosave({revision: 1, immediate: true});
        await new Promise(resolve => window.setTimeout(resolve, 10));

        expect(saved[0].metadata?.pageCount).toBeNull();
        expect(refreshed).toHaveLength(1);
    });

    it('drops superseded layout refreshes before their asynchronous callback starts', async () => {
        const refreshed: Snapshot[] = [];
        const {editor} = await renderFixture(() => true, undefined, (value, metadata) => {
            refreshed.push({value, metadata});

            return Promise.resolve();
        }, longDocument());

        await waitFor(() => refreshed.length === 1);

        const initialPages = refreshed[0].metadata!.pageCount!;
        const commands = editor.commands as {updatePaginationSettings?: (settings: {pageHeight: number}) => boolean};

        commands.updatePaginationSettings?.({pageHeight: 50});
        paginationStorage(editor).flushRecalc?.();
        commands.updatePaginationSettings?.({pageHeight: 200});
        paginationStorage(editor).flushRecalc?.();
        await waitFor(() => refreshed.length >= 2);

        expect(refreshed).toHaveLength(2);
        expect(refreshed[1].metadata?.pageCount).toBeLessThan(initialPages);
    });

    it('retries failed measured metadata refreshes instead of deduplicating them as saved', async () => {
        let attempts = 0;
        let finishFirst: ((result: boolean) => void) | undefined;
        const {editor} = await renderFixture(() => true, undefined, async () => {
            attempts += 1;

            if (attempts === 1) {
                return new Promise<boolean>(resolve => {
                    finishFirst = resolve;
                });
            }

            return true;
        });

        expect(attempts).toBe(1);
        paginationStorage(editor).flushRecalc?.();
        expect(attempts).toBe(1);
        finishFirst?.(false);
        await new Promise(resolve => window.setTimeout(resolve, 0));
        paginationStorage(editor).flushRecalc?.();
        await waitFor(() => attempts === 2);
        paginationStorage(editor).flushRecalc?.();

        expect(attempts).toBe(2);
    });

    it('refreshes initial and settings-only measured metadata without saving the document again', async () => {
        const refreshed: Snapshot[] = [];
        const saved: Snapshot[] = [];
        const {editor} = await renderFixture((value, metadata) => {
            saved.push({value, metadata});

            return true;
        }, undefined, (value, metadata) => {
            refreshed.push({value, metadata});
        }, longDocument());

        await waitFor(() => refreshed.length === 1);
        expect(refreshed[0].metadata?.pageCount).toBeGreaterThan(1);

        const commands = editor.commands as {updatePaginationSettings?: (settings: {pageHeight: number}) => boolean};

        commands.updatePaginationSettings?.({pageHeight: 50});
        paginationStorage(editor).flushRecalc?.();
        await waitFor(() => refreshed.length === 2);
        paginationStorage(editor).flushRecalc?.();

        expect(refreshed[1].metadata?.pageCount).toBeGreaterThan(refreshed[0].metadata!.pageCount!);
        expect(refreshed[1].value).toEqual(refreshed[0].value);
        expect(refreshed).toHaveLength(2);
        expect(saved).toHaveLength(0);
    });

    it('keeps dirty typing on its ordinary save path instead of refreshing metadata separately', async () => {
        const refreshed: Snapshot[] = [];
        const {editor, controller} = await renderFixture(() => true, undefined, (value, metadata) => {
            refreshed.push({value, metadata});

            return Promise.resolve();
        });

        await waitFor(() => refreshed.length === 1);
        editor.commands.setContent(longDocument());
        controller.scheduleAutosave({revision: 1});
        paginationStorage(editor).flushRecalc?.();

        expect(refreshed).toHaveLength(1);
        await controller.handleManualSave();
    });

    it('saves structural changes with new measured pages before the next animation frame', async () => {
        const saved: Snapshot[] = [];
        const {editor, controller} = await renderFixture((value, metadata) => {
            saved.push({value, metadata});

            return true;
        });

        expect(paginationStorage(editor).state.pageCount).toBe(1);
        editor.commands.setContent(longDocument());
        controller.scheduleAutosave({revision: 1, immediate: true});

        expect(saved).toHaveLength(1);
        expect(saved[0].metadata?.pageCount).toBeGreaterThan(1);
        expect(saved[0].metadata).toMatchObject({
            sceneCount: 2,
            actSceneCounts: [2],
            unassignedSceneCount: 0,
        });
        expect(saved[0].value.content).toHaveLength(33);
    });

    it('keeps debounced async save metadata paired with the document captured before value synchronization', async () => {
        const saved: Snapshot[] = [];
        let finishSave: (() => void) | undefined;
        const {editor, controller} = await renderFixture((value, metadata) => {
            saved.push({value, metadata});

            return new Promise(resolve => {
                finishSave = () => resolve(true);
            });
        }, editor => {
            editor.commands.setContent(shortDocument());
            paginationStorage(editor).flushRecalc?.();
        });

        editor.commands.setContent(longDocument());
        controller.scheduleAutosave({revision: 1});
        await waitFor(() => saved.length === 1);

        expect(paginationStorage(editor).state.pageCount).toBe(1);
        expect(saved[0].metadata?.pageCount).toBeGreaterThan(1);
        expect(saved[0].metadata?.actSceneCounts).toEqual([2]);
        expect(saved[0].value.content).toHaveLength(33);
        finishSave?.();
    });

    it('flushes pending pagination for manual saves', async () => {
        const saved: Snapshot[] = [];
        const {editor, controller} = await renderFixture((value, metadata) => {
            saved.push({value, metadata});

            return true;
        });

        editor.commands.setContent(longDocument());
        controller.scheduleAutosave({revision: 1});
        await controller.handleManualSave();

        expect(saved).toHaveLength(1);
        expect(saved[0].metadata?.pageCount).toBeGreaterThan(1);
        expect(saved[0].metadata?.sceneCount).toBe(2);
    });

    it('saves unknown pages when the changed document has no measurable layout', async () => {
        const saved: Snapshot[] = [];
        const {editor, controller} = await renderFixture((value, metadata) => {
            saved.push({value, metadata});

            return true;
        });

        editor.view.dom.remove();
        editor.commands.setContent(longDocument());
        controller.scheduleAutosave({revision: 1, immediate: true});

        expect(saved[0].metadata?.pageCount).toBeNull();
        expect(saved[0].metadata?.sceneCount).toBe(2);
    });

    it('clears its synchronous pagination callback when the editor is destroyed', async () => {
        const {editor} = await renderFixture(() => true);
        const storage = paginationStorage(editor);
        const flush = storage.flushRecalc;

        expect(flush?.()).toBe(true);
        editor.destroy();

        expect(storage.flushRecalc).toBeUndefined();
        expect(flush?.()).toBe(false);
    });
});
