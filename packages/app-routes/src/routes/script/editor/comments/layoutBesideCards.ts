export interface BesideCardInput {
    threadId: string;
    blockId: string;
    anchorTop: number;
    height: number;
}

export interface BesideCardEntry {
    key: string;
    blockId: string;
    threadIds: readonly string[];
    top: number;
    height: number;
    collapsed: boolean;
}

export const COLLAPSE_THRESHOLD = 3;

interface LayoutBesideCardsArgs {
    cards: readonly BesideCardInput[];
    activeThreadId: string | null;
    expandedBlockId: string | null;
    collapsedHeight: number;
    gap: number;
    /** Gap between blocks when either side is a run of several cards; defaults to `gap`. */
    groupGap?: number;
}

type PendingEntry = Omit<BesideCardEntry, 'top'> & {desired: number; order: number};

const toEntries = ({cards, activeThreadId, expandedBlockId, collapsedHeight}: LayoutBesideCardsArgs) => {
    const groups = new Map<string, BesideCardInput[]>();
    const entries: PendingEntry[] = [];

    cards.forEach(card => groups.set(card.blockId, [...(groups.get(card.blockId) ?? []), card]));
    groups.forEach((group, blockId) => {
        const shouldCollapse = group.length >= COLLAPSE_THRESHOLD && blockId !== expandedBlockId && !group.some(card => card.threadId === activeThreadId);

        if (shouldCollapse) {
            entries.push({
                key: `group:${blockId}`,
                blockId,
                threadIds: group.map(card => card.threadId),
                height: collapsedHeight,
                collapsed: true,
                desired: Math.min(...group.map(card => card.anchorTop)),
                order: entries.length,
            });

            return;
        }

        group.forEach(card =>
            entries.push({
                key: card.threadId,
                blockId,
                threadIds: [card.threadId],
                height: card.height,
                collapsed: false,
                desired: card.anchorTop,
                order: entries.length,
            }),
        );
    });

    return entries.sort((left, right) => left.desired - right.desired || left.order - right.order);
};

/*
 * Cards sit at their anchors; collisions stack downward with a gap. The active
 * card keeps its exact anchor and pushes earlier cards up instead.
 */
export const layoutBesideCards = (args: LayoutBesideCardsArgs): BesideCardEntry[] => {
    const {activeThreadId, gap, groupGap = gap} = args;
    const entries = toEntries(args);
    const cardsPerBlock = new Map<string, number>();

    entries.forEach(entry => cardsPerBlock.set(entry.blockId, (cardsPerBlock.get(entry.blockId) ?? 0) + 1));

    // Space between entry `index` and the one before it.
    const gapBefore = (index: number) => {
        const {blockId} = entries[index];
        const previousBlockId = entries[index - 1].blockId;
        const isGroupEdge = blockId !== previousBlockId && ((cardsPerBlock.get(blockId) ?? 0) > 1 || (cardsPerBlock.get(previousBlockId) ?? 0) > 1);

        return isGroupEdge ? groupGap : gap;
    };
    const tops = entries.map(entry => entry.desired);
    const activeIndex = activeThreadId === null ? -1 : entries.findIndex(entry => entry.threadIds.includes(activeThreadId));
    const pivot = Math.max(activeIndex, 0);

    for (let index = pivot + 1; index < entries.length; index += 1) {
        tops[index] = Math.max(entries[index].desired, tops[index - 1] + entries[index - 1].height + gapBefore(index));
    }

    for (let index = pivot - 1; index >= 0; index -= 1) {
        tops[index] = Math.min(entries[index].desired, tops[index + 1] - gapBefore(index + 1) - entries[index].height);
    }

    return entries.map(({desired: _desired, order: _order, ...entry}, index) => ({...entry, top: tops[index]}));
};
