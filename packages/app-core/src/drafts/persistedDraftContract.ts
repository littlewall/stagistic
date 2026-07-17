import {structuralValueEquals} from '@stagistic/shared';

export type PersistedDraftStatus =
    | 'loading'
    | 'idle'
    | 'dirty'
    | 'saving'
    | 'saved'
    | 'error';

export interface PersistedDraftScheduler {
    schedule: (callback: () => void, delayMs: number) => unknown,
    cancel: (handle: unknown) => void,
}

export interface PersistedDraftSnapshot<TValue> {
    value: TValue,
    status: PersistedDraftStatus,
    isHydrated: boolean,
    isDirty: boolean,
    error: Error | null,
}

export interface PersistedDraftEntity<TKey, TValue> {
    key: TKey | null,
    confirmedValue: TValue,
    isHydrated: boolean,
}

export interface PersistedDraftControllerOptions<TKey, TValue> {
    defaultValue: TValue,
    persist: (key: TKey, value: TValue) => Promise<void>,
    debounceMs?: number,
    equals?: (left: TValue, right: TValue) => boolean,
    scheduler?: PersistedDraftScheduler,
}

export const defaultDraftEquals = <TValue>(left: TValue, right: TValue) => {
    return structuralValueEquals(left, right);
};

export const toDraftError = (error: unknown) => {
    return error instanceof Error ? error : new Error(String(error));
};
