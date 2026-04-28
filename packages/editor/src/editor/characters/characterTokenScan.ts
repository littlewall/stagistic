import {
    normalizeCharacterKey,
    splitCharacterTokens,
} from '@stagistic/script';
import {type Node as ProseMirrorNode} from '@tiptap/pm/model';

import {
    readNormalizedRefsFromAttrs,
    visitCharacterBlocks,
} from './characterRefUtils';

export interface CharacterTokenEntry {
    blockId: string,
    blockStart: number,
    tokenIndex: number,
    key: string,
    characterId: string | null,
    valueStart: number,
    valueEnd: number,
    end: number,
}

export interface ActiveCharacterToken {
    id: string,
    blockId: string,
    tokenIndex: number,
    key: string,
    characterId: string | null,
}

export interface CharacterTokenScanResult {
    tokenEntries: CharacterTokenEntry[],
    tokenCountByKey: ReadonlyMap<string, number>,
    activeToken: ActiveCharacterToken | null,
}

interface ScanCharacterTokensArgs {
    doc: ProseMirrorNode,
    selectionFrom?: number | null,
}

const getActiveTokenIndex = (line: string, offset: number) => {
    const tokens = splitCharacterTokens(line);

    if (tokens.length === 0) {
        return -1;
    }

    const clampedOffset = Math.max(0, offset);

    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];

        if (clampedOffset === token.end && index < tokens.length - 1) {
            return index + 1;
        }

        if (clampedOffset >= token.start && clampedOffset < token.end) {
            return index;
        }
    }

    return tokens.length - 1;
};

export const resolveCharacterBlockId = (rawBlockId: unknown, blockPos: number) => {
    if (typeof rawBlockId !== 'string' || rawBlockId.trim().length === 0) {
        return `block-pos:${blockPos}`;
    }

    return rawBlockId.trim();
};

export const getCharacterTokenColorKey = (blockId: string, tokenIndex: number) => {
    return `${blockId}\u0001${tokenIndex}`;
};

export const scanCharacterTokensFromDoc = ({
    doc,
    selectionFrom,
}: ScanCharacterTokensArgs): CharacterTokenScanResult => {
    const tokenEntries: CharacterTokenEntry[] = [];
    const tokenCountByKey = new Map<string, number>();
    let activeToken: ActiveCharacterToken | null = null;

    try {
        visitCharacterBlocks({
            doc,
            onCharacterBlock: (node, pos) => {
                const text = node.textContent ?? '';
                const tokens = splitCharacterTokens(text);
                const refsByKey = readNormalizedRefsFromAttrs(node.attrs as Record<string, unknown>);
                const blockStart = pos + 1;
                const blockId = resolveCharacterBlockId(node.attrs.id, pos);

                tokens.forEach((token, tokenIndex) => {
                    const key = normalizeCharacterKey(token.value);
                    const characterId = key
                        ? refsByKey[key] ?? null
                        : null;

                    tokenEntries.push({
                        blockId,
                        blockStart,
                        tokenIndex,
                        key,
                        characterId,
                        valueStart: token.valueStart,
                        valueEnd: token.valueEnd,
                        end: token.end,
                    });

                    if (!key) {
                        return;
                    }

                    tokenCountByKey.set(key, (tokenCountByKey.get(key) ?? 0) + 1);
                });

                if (activeToken || selectionFrom === undefined || selectionFrom === null) {
                    return false;
                }

                const blockEnd = blockStart + text.length;

                if (selectionFrom < blockStart || selectionFrom > blockEnd) {
                    return false;
                }

                const activeTokenIndex = getActiveTokenIndex(text, selectionFrom - blockStart);

                if (activeTokenIndex < 0 || activeTokenIndex >= tokens.length) {
                    return false;
                }

                const token = tokens[activeTokenIndex];
                const key = normalizeCharacterKey(token.value);
                const characterId = key
                    ? refsByKey[key] ?? null
                    : null;

                activeToken = {
                    id: getCharacterTokenColorKey(blockId, activeTokenIndex),
                    blockId,
                    tokenIndex: activeTokenIndex,
                    key,
                    characterId,
                };

                return false;
            },
        });
    } catch {
        return {
            tokenEntries: [],
            tokenCountByKey: new Map<string, number>(),
            activeToken: null,
        };
    }

    return {
        tokenEntries,
        tokenCountByKey,
        activeToken,
    };
};
