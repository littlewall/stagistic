import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
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
    const entityRef = useRef({
        key: entityKey,
        confirmedValue,
        isHydrated,
    });

    entityRef.current = {
        key: entityKey,
        confirmedValue,
        isHydrated,
    };

    const controller = useMemo(() => {
        const nextController = createPersistedDraftController({
            defaultValue,
            persist,
            debounceMs,
            equals,
            scheduler,
        });

        /*
         * Seed the controller before its first snapshot is read. Otherwise its
         * default null-entity snapshot reports hydrated=true for one render,
         * which can expose default values as if they belonged to entityKey.
         */
        nextController.setEntity(entityRef.current);

        /*
         * Entity changes are applied by the layout effect below without
         * replacing the controller or losing a dirty draft.
         */
        return nextController;
    }, [
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
    const isCurrentEntity = Object.is(controller.getEntityKey(), entityKey);

    return {
        draft: isCurrentEntity ? snapshot.value : defaultValue,
        status: isCurrentEntity ? snapshot.status : 'loading' as const,
        isHydrated: isCurrentEntity && snapshot.isHydrated,
        isDirty: isCurrentEntity && snapshot.isDirty,
        error: isCurrentEntity ? snapshot.error : null,
        setDraft: controller.update,
        flush: controller.flush,
        retry: controller.retry,
    };
};
