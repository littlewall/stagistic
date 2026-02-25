import {
    normalizeCharacterKey,
    splitCharacterTokens,
} from '@stagistic/script-core';
import {type Node as ProseMirrorNode} from '@tiptap/pm/model';
import {
    Decoration,
    DecorationSet,
} from '@tiptap/pm/view';

import {
    getCharacterColor,
    getCharacterColorVarName,
} from '../../../characterColors';
import {
    isFountainBlockNodeName,
    normalizeFountainBlockType,
} from '../../fountainCore';
import styles from '../CharacterTagDecorations.module.css';
import {isCharacterBlockType} from './types';

export const buildDecorations = (
    doc: ProseMirrorNode,
    characterColorSaturation?: number,
    colorByCharacterId?: ReadonlyMap<string, string>,
) => {
    const decorations: Decoration[] = [];

    doc.descendants((node, pos) => {
        if (!isFountainBlockNodeName(node.type.name)) {
            return true;
        }

        const blockType = normalizeFountainBlockType(node.attrs.blockType);

        if (!isCharacterBlockType(blockType)) {
            return false;
        }

        const text = node.textContent ?? '';
        const blockStart = pos + 1;
        const tokens = splitCharacterTokens(text);
        const characterRefs = (node.attrs.characterRefs ?? {}) as Record<string, string>;

        tokens.forEach((token, index) => {
            if (token.valueStart < token.valueEnd) {
                const key = normalizeCharacterKey(token.value);
                const characterId = key ? characterRefs[key] ?? null : null;
                const confirmedColor = characterId && colorByCharacterId
                    ? colorByCharacterId.get(characterId)
                    : undefined;
                const color = confirmedColor ?? getCharacterColor(key, characterColorSaturation);
                const decorationEnd = Math.max(token.valueEnd, token.end);

                decorations.push(Decoration.inline(
                    blockStart + token.valueStart,
                    blockStart + decorationEnd,
                    {
                        class: styles.characterTag,
                        style: `--character-tag-color: var(${getCharacterColorVarName(key)}, ${color});`,
                    },
                ));
            }

            if (index === tokens.length - 1) {
                return;
            }

            const plusOffset = token.end;

            if (plusOffset < 0 || plusOffset >= text.length || text[plusOffset] !== '+') {
                return;
            }

            decorations.push(Decoration.inline(
                blockStart + plusOffset,
                blockStart + plusOffset + 1,
                {
                    class: styles.characterSeparator,
                },
            ));
        });

        return false;
    });

    return DecorationSet.create(doc, decorations);
};
