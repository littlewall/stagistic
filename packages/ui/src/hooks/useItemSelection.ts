import {useState} from 'react';

export const useItemSelection = (
    items: readonly {id: string}[],
    initialId?: string | null,
    resetOnInitialChange = false,
) => {
    const [selectedId, setSelectedId] = useState<string | null>(initialId ?? null);
    const [previousInitialId, setPreviousInitialId] = useState(initialId);
    const [hasReceivedItems, setHasReceivedItems] = useState(items.length > 0);
    const initialChanged = previousInitialId !== initialId;

    if (!hasReceivedItems && items.length > 0) {
        setHasReceivedItems(true);
    }

    if (initialChanged) {
        setPreviousInitialId(initialId);
    }

    const preferredId = resetOnInitialChange && initialChanged ? initialId : selectedId;
    const nextId = items.some(item => item.id === preferredId)
        ? preferredId ?? null
        : items.find(item => item.id === initialId)?.id ?? items[0]?.id ?? (!hasReceivedItems ? initialId ?? null : null);

    if (nextId !== selectedId) {
        setSelectedId(nextId);
    }

    return [nextId, setSelectedId] as const;
};
