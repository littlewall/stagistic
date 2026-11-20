import type {ReactiveQuerySource} from '../reactive';

export const createScriptSourceRegistry = <T>(createSource: (scriptId: string) => ReactiveQuerySource<T>) => {
    const sources = new Map<string, ReactiveQuerySource<T>>();

    return (scriptId: string) => {
        const existing = sources.get(scriptId);

        if (existing) {
            return existing;
        }

        const source = createSource(scriptId);

        sources.set(scriptId, source);

        return source;
    };
};

