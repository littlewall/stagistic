import {
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {
    createPersistedDraftController,
    type PersistedDraftScheduler,
} from './createPersistedDraftController';

const deferred = () => {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return {
        promise, resolve, reject,
    };
};

const createScheduler = () => {
    const callbacks = new Map<number, () => void>();
    let nextId = 0;
    const scheduler: PersistedDraftScheduler = {
        schedule: callback => {
            nextId += 1;
            callbacks.set(nextId, callback);

            return nextId;
        },
        cancel: handle => {
            callbacks.delete(handle as number);
        },
    };

    return {
        scheduler,
        run: () => {
            const queued = [...callbacks.values()];

            callbacks.clear();
            queued.forEach(callback => callback());
        },
        size: () => callbacks.size,
    };
};

describe('persisted draft controller', () => {
    it('hydrates once and only applies external updates to a clean draft', () => {
        const controller = createPersistedDraftController({
            defaultValue: '',
            persist: () => Promise.resolve(),
        });

        controller.resume();
        controller.setEntity({
            key: 'one', confirmedValue: '', isHydrated: false,
        });
        expect(controller.getSnapshot()).toMatchObject({status: 'loading', isHydrated: false});

        controller.setEntity({
            key: 'one', confirmedValue: 'First', isHydrated: true,
        });
        expect(controller.getSnapshot().value).toBe('First');

        controller.setEntity({
            key: 'one', confirmedValue: 'External', isHydrated: true,
        });
        expect(controller.getSnapshot().value).toBe('External');

        controller.update('Local');
        controller.setEntity({
            key: 'one', confirmedValue: 'Other', isHydrated: true,
        });
        expect(controller.getSnapshot()).toMatchObject({
            value: 'Local',
            isDirty: true,
        });
    });

    it('debounces changes and coalesces an in-flight save to the newest value', async () => {
        const firstSave = deferred();
        const persisted: string[] = [];
        const {
            scheduler, run, size,
        } = createScheduler();
        const controller = createPersistedDraftController({
            defaultValue: '',
            scheduler,
            persist: async (_key: string, value: string) => {
                persisted.push(value);

                if (value === 'First') {
                    await firstSave.promise;
                }
            },
        });

        controller.resume();
        controller.setEntity({
            key: 'one', confirmedValue: 'Initial', isHydrated: true,
        });
        controller.update('Ignored');
        controller.update('First');

        expect(size()).toBe(1);
        run();
        await Promise.resolve();
        expect(persisted).toEqual(['First']);

        controller.update('Second');
        controller.update('Newest');
        firstSave.resolve();
        await controller.flush();

        expect(persisted).toEqual(['First', 'Newest']);
        expect(controller.getSnapshot()).toMatchObject({
            value: 'Newest',
            status: 'saved',
            isDirty: false,
        });
    });

    it('re-persists a draft reverted to the confirmed value while a save is in flight', async () => {
        const firstSave = deferred();
        const persisted: string[] = [];
        const {scheduler, run} = createScheduler();
        const controller = createPersistedDraftController({
            defaultValue: '',
            scheduler,
            persist: async (_key: string, value: string) => {
                persisted.push(value);

                if (value === 'Appearance') {
                    await firstSave.promise;
                }
            },
        });

        controller.resume();
        controller.setEntity({
            key: 'one', confirmedValue: 'Name', isHydrated: true,
        });
        controller.update('Appearance');
        run();
        await Promise.resolve();
        expect(persisted).toEqual(['Appearance']);

        controller.update('Name');
        controller.setEntity({
            key: 'one', confirmedValue: 'Appearance', isHydrated: true,
        });

        firstSave.resolve();
        await controller.flush();

        expect(persisted).toEqual(['Appearance', 'Name']);
        expect(controller.getSnapshot()).toMatchObject({
            value: 'Name',
            status: 'saved',
            isDirty: false,
        });
    });

    it('keeps the draft value when a confirmed echo arrives during an in-flight save', async () => {
        const firstSave = deferred();
        const persisted: string[] = [];
        const {scheduler, run} = createScheduler();
        const controller = createPersistedDraftController({
            defaultValue: '',
            scheduler,
            persist: async (_key: string, value: string) => {
                persisted.push(value);

                if (value === 'Appearance') {
                    await firstSave.promise;
                }
            },
        });

        controller.resume();
        controller.setEntity({
            key: 'one', confirmedValue: 'Name', isHydrated: true,
        });
        controller.update('Appearance');
        run();
        await Promise.resolve();

        controller.update('Name');

        expect(controller.getSnapshot()).toMatchObject({
            value: 'Name',
            isDirty: true,
        });

        controller.setEntity({
            key: 'one', confirmedValue: 'Appearance', isHydrated: true,
        });
        expect(controller.getSnapshot().value).toBe('Name');

        firstSave.resolve();
        await controller.flush();

        expect(persisted).toEqual(['Appearance', 'Name']);
    });

    it('retains a failed draft and retries it', async () => {
        const persist = vi.fn()
            .mockRejectedValueOnce(new Error('disk full'))
            .mockResolvedValueOnce(undefined);
        const controller = createPersistedDraftController({
            defaultValue: '',
            persist,
        });

        controller.resume();
        controller.setEntity({
            key: 'one', confirmedValue: 'Initial', isHydrated: true,
        });
        controller.update('Failed value');

        const failedSave = controller.flush();

        controller.setEntity({
            key: 'one',
            confirmedValue: 'Failed value',
            isHydrated: true,
        });
        controller.setEntity({
            key: 'one',
            confirmedValue: 'Initial',
            isHydrated: true,
        });

        await expect(failedSave).rejects.toThrow('disk full');
        expect(controller.getSnapshot()).toMatchObject({
            value: 'Failed value',
            status: 'error',
            isDirty: true,
        });

        await controller.retry();
        expect(controller.getSnapshot()).toMatchObject({
            value: 'Failed value',
            status: 'saved',
            isDirty: false,
        });
    });

    it('ignores a pending save completion after the entity key changes', async () => {
        const pending = deferred();
        const controller = createPersistedDraftController({
            defaultValue: '',
            persist: () => pending.promise,
        });

        controller.resume();
        controller.setEntity({
            key: 'one', confirmedValue: 'One', isHydrated: true,
        });
        controller.update('Saving one');

        const save = controller.flush();

        controller.setEntity({
            key: 'two', confirmedValue: 'Two', isHydrated: true,
        });
        pending.resolve();
        await save;

        expect(controller.getSnapshot()).toMatchObject({
            value: 'Two',
            status: 'idle',
            isDirty: false,
        });
    });

    it('persists a new entity update queued behind the previous entity save', async () => {
        const pendingFirstSave = deferred();
        const persisted: string[] = [];
        const controller = createPersistedDraftController({
            defaultValue: '',
            persist: async (key: string, value: string) => {
                persisted.push(`${key}:${value}`);

                if (key === 'one') {
                    await pendingFirstSave.promise;
                }
            },
        });

        controller.resume();
        controller.setEntity({
            key: 'one', confirmedValue: 'One', isHydrated: true,
        });
        controller.update('Saving one');

        const firstSave = controller.flush();

        controller.setEntity({
            key: 'two', confirmedValue: 'Two', isHydrated: true,
        });
        controller.update('Saving two');

        const secondSave = controller.flush();

        expect(persisted).toEqual(['one:Saving one']);

        pendingFirstSave.resolve();
        await Promise.all([firstSave, secondSave]);

        expect(persisted).toEqual(['one:Saving one', 'two:Saving two']);
        expect(controller.getSnapshot()).toMatchObject({
            value: 'Saving two',
            status: 'saved',
            isDirty: false,
        });
    });

    it('resets loading state when the entity key changes', () => {
        const controller = createPersistedDraftController({
            defaultValue: '',
            persist: () => Promise.resolve(),
        });

        controller.resume();
        controller.setEntity({
            key: 'one', confirmedValue: '', isHydrated: false,
        });
        controller.setEntity({
            key: 'two', confirmedValue: 'Two', isHydrated: true,
        });

        expect(controller.getSnapshot()).toMatchObject({
            value: 'Two',
            status: 'idle',
            isHydrated: true,
        });
    });
});
