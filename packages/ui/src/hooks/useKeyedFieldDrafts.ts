import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

interface FieldDraft<TValue> {
    revision: number,
    value: TValue,
}

export const useKeyedFieldDrafts = <TValue>(scopeKey: string | null) => {
    const revisionRef = useRef(0);
    const draftsRef = useRef<Record<string, FieldDraft<TValue>>>({});
    const [drafts, setDrafts] = useState<Record<string, FieldDraft<TValue>>>({});

    useEffect(() => {
        draftsRef.current = {};
        setDrafts({});
    }, [scopeKey]);

    const setValue = useCallback((key: string, value: TValue) => {
        const revision = revisionRef.current + 1;
        const nextDraft = {revision, value};

        revisionRef.current = revision;
        draftsRef.current = {...draftsRef.current, [key]: nextDraft};
        setDrafts(draftsRef.current);
    }, []);

    const resetValue = useCallback((key: string) => {
        if (!(key in draftsRef.current)) {
            return;
        }

        const nextDrafts = {...draftsRef.current};

        delete nextDrafts[key];
        draftsRef.current = nextDrafts;
        setDrafts(nextDrafts);
    }, []);

    const persistValue = useCallback(async (
        key: string,
        value: TValue,
        persist: (draft: TValue) => void | Promise<unknown>,
    ) => {
        const revision = draftsRef.current[key]?.revision;

        await persist(value);

        if (revision === undefined || draftsRef.current[key]?.revision !== revision) {
            return;
        }

        resetValue(key);
    }, [resetValue]);

    const getValue = useCallback((key: string, confirmed: TValue) => {
        return drafts[key]?.value ?? confirmed;
    }, [drafts]);

    return {
        getValue,
        persistValue,
        resetValue,
        setValue,
    };
};
