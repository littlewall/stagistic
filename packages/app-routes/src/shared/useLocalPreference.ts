import {useCallback, useState} from 'react';

interface UseLocalPreferenceArgs<T> {
    key: string,
    defaultValue: T,
    /** Validates the stored value; undefined falls back to the default (stale or foreign data). */
    parse: (value: unknown) => T | undefined,
}

const readPreference = <T>(key: string, parse: (value: unknown) => T | undefined): T | undefined => {
    try {
        const raw = window.localStorage.getItem(key);

        return raw === null ? undefined : parse(JSON.parse(raw));
    } catch {
        return undefined;
    }
};

const writePreference = (key: string, value: unknown) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore storage write failures in constrained environments.
    }
};

/** useState for one UI preference, persisted in localStorage under its key. */
export const useLocalPreference = <T>({
    key,
    defaultValue,
    parse,
}: UseLocalPreferenceArgs<T>) => {
    const [entry, setEntry] = useState(() => ({key, value: readPreference(key, parse) ?? defaultValue}));
    let {value} = entry;

    // A new key (e.g. another script) is re-read during render so the old value never shows.
    if (entry.key !== key) {
        value = readPreference(key, parse) ?? defaultValue;
        setEntry({key, value});
    }

    const setValue = useCallback(
        (next: T) => {
            setEntry({key, value: next});
            writePreference(key, next);
        },
        [key],
    );

    return [value, setValue] as const;
};
