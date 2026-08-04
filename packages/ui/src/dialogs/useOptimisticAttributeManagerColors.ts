import {
    useMemo,
    useRef,
    useState,
} from 'react';

interface ColorItem {
    id: string,
    color: string | null,
}

interface ColorIntent {
    color: string | null,
    revision: number,
}

export const useOptimisticAttributeManagerColors = <TItem extends ColorItem>(
    items: TItem[],
    onSetColor?: (itemId: string, colorHex: string | null) => void | Promise<unknown>,
) => {
    const revisionRef = useRef(0);
    const [intents, setIntents] = useState<Record<string, ColorIntent>>({});
    const colorizedItems = useMemo(() => items.map(item => ({
        ...item,
        color: item.id in intents
            ? intents[item.id]?.color ?? null
            : item.color,
    })), [intents, items]);
    const setColor = (itemId: string, colorHex: string | null) => {
        const revision = revisionRef.current + 1;

        revisionRef.current = revision;
        setIntents(previous => ({...previous, [itemId]: {color: colorHex, revision}}));
        void Promise.resolve(onSetColor?.(itemId, colorHex)).catch(() => undefined).finally(() => {
            setIntents(previous => {
                if (previous[itemId]?.revision !== revision) {
                    return previous;
                }

                const next = {...previous};

                delete next[itemId];

                return next;
            });
        });
    };

    return {
        colorizedItems,
        setColor,
    };
};
