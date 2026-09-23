import {collectCharacterTags, normalizeCharacterKey, type ScriptNode, splitCharacterTokens} from '@stagistic/script';
import {type Node as ProseMirrorNode} from '@tiptap/pm/model';

import {isScriptBlockNodeName} from '../tiptap/scriptCore';
import {readNormalizedRefsFromAttrs, visitCharacterBlocks} from './characterRefUtils';

export interface CharacterTokenEntry {
    blockId: string;
    blockStart: number;
    tokenIndex: number;
    key: string;
    characterId: string | null;
    valueStart: number;
    valueEnd: number;
    end: number;
    /**
     * 'cue' = a token inside a character (cue) block, decorated via the
     * runtime. 'tag' = a characterTag mark in a stage direction, which
     * renders its own DOM — it contributes colors/counts but is skipped by
     * the decoration builder.
     */
    source: 'cue' | 'tag';
}

export interface ActiveCharacterToken {
    id: string;
    blockId: string;
    tokenIndex: number;
    key: string;
    characterId: string | null;
}

export interface CharacterTokenScanResult {
    tokenEntries: CharacterTokenEntry[];
    tokenCountByKey: ReadonlyMap<string, number>;
    activeToken: ActiveCharacterToken | null;
}

interface ScanCharacterTokensArgs {
    doc: ProseMirrorNode;
    selectionFrom?: number | null;
}

export const getActiveTokenIndex = (line: string, offset: number) => {
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

export const scanCharacterTokensFromDoc = ({doc, selectionFrom}: ScanCharacterTokensArgs): CharacterTokenScanResult => {
    const tokenEntries: CharacterTokenEntry[] = [];
    const tokenCountByKey = new Map<string, number>();
    let activeToken: ActiveCharacterToken | null = null;

    try {
        visitCharacterBlocks({
            doc,
            onCharacterBlock: (node, pos) => {
                const text = node.textContent ?? '';
                const tokens = splitCharacterTokens(text);
                const refsByKey = readNormalizedRefsFromAttrs(node.attrs);
                const blockStart = pos + 1;
                const blockId = resolveCharacterBlockId(node.attrs.id, pos);

                tokens.forEach((token, tokenIndex) => {
                    const key = normalizeCharacterKey(token.value);
                    const characterId = key ? (refsByKey[key] ?? null) : null;

                    tokenEntries.push({
                        blockId,
                        blockStart,
                        tokenIndex,
                        key,
                        characterId,
                        valueStart: token.valueStart,
                        valueEnd: token.valueEnd,
                        end: token.end,
                        source: 'cue',
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
                const characterId = key ? (refsByKey[key] ?? null) : null;

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

        /*
         * Second pass: characterTag marks in non-cue blocks (stage
         * directions). These contribute keys/ids to the color palette and
         * live counts; their on-screen rendering is the mark's own DOM, so
         * they carry zero positions and source:'tag' to be skipped by the
         * decoration builder.
         */
        doc.descendants((node, pos) => {
            if (!isScriptBlockNodeName(node.type.name)) {
                return true;
            }

            if (node.type.name === 'character') {
                return false;
            }

            const tags = collectCharacterTags(node.toJSON() as ScriptNode);

            if (tags.length === 0) {
                return false;
            }

            const blockStart = pos + 1;
            const blockId = resolveCharacterBlockId(node.attrs.id, pos);

            tags.forEach((tag, tokenIndex) => {
                tokenEntries.push({
                    blockId,
                    blockStart,
                    tokenIndex,
                    key: tag.key,
                    characterId: tag.characterId,
                    valueStart: 0,
                    valueEnd: 0,
                    end: 0,
                    source: 'tag',
                });

                tokenCountByKey.set(tag.key, (tokenCountByKey.get(tag.key) ?? 0) + 1);
            });

            return false;
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
