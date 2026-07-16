import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useSyncExternalStore,
} from 'react';

import {
    createPersistedDraftController,
    type PersistedDraftScheduler,
} from './createPersistedDraftController';

interface UsePersistedDraftOptions<TKey, TValue> {
    entityKey: TKey | null,
    confirmedValue: TValue,
    isHydrated: boolean,
    defaultValue: TValue,
    persist: (key: TKey, value: TValue) => Promise<void>,
    debounceMs?: number,
    equals?: (left: TValue, right: TValue) => boolean,
    scheduler?: PersistedDraftScheduler,
}

export const usePersistedDraft = <TKey, TValue>({
    entityKey,
    confirmedValue,
    isHydrated,
    defaultValue,
    persist,
    debounceMs,
    equals,
    scheduler,
}: UsePersistedDraftOptions<TKey, TValue>) => {
    const controller = useMemo(() => createPersistedDraftController({
        defaultValue,
        persist,
        debounceMs,
        equals,
        scheduler,
    }), [
        debounceMs,
        defaultValue,
        equals,
        scheduler,
    ]);

    controller.setPersist(persist);

    useLayoutEffect(() => {
        controller.setEntity({
            key: entityKey,
            confirmedValue,
            isHydrated,
        });
    }, [
        confirmedValue,
        controller,
        entityKey,
        isHydrated,
    ]);

    useEffect(() => {
        controller.resume();

        return controller.pause;
    }, [controller]);

    const snapshot = useSyncExternalStore(
        controller.subscribe,
        controller.getSnapshot,
        controller.getSnapshot,
    );

    return {
        draft: snapshot.value,
        status: snapshot.status,
        isHydrated: snapshot.isHydrated,
        isDirty: snapshot.isDirty,
        error: snapshot.error,
        setDraft: controller.update,
        flush: controller.flush,
        retry: controller.retry,
    };
};
