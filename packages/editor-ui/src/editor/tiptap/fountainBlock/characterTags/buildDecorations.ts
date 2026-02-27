import {
    normalizeCharacterKey,
    splitCharacterTokens,
} from '@stagistic/script-core';
import {type Node as ProseMirrorNode} from '@tiptap/pm/model';
import {
    Decoration,
    DecorationSet,
} from '@tiptap/pm/view';

import {getCharacterColorVarName} from '../../../characterColors';
import {
    buildCharacterDocColorState,
    getCharacterTokenColorKey,
    getUnconfirmedCharacterColor,
    resolveCharacterBlockId,
} from '../../../characters/colorResolver';
import type {PersistentCharacterRef} from '../../../contracts';
import {
    isFountainBlockNodeName,
    normalizeFountainBlockType,
} from '../../fountainCore';
import styles from '../CharacterTagDecorations.module.css';
import {isCharacterBlockType} from './types';

interface BuildDecorationsArgs {
    doc: ProseMirrorNode,
    characterColorSaturation?: number,
    colorByCharacterId?: ReadonlyMap<string, string>,
    rememberedColorByKey?: ReadonlyMap<string, string>,
    persistentCharacters?: readonly PersistentCharacterRef[],
    selectionFrom?: number | null,
}

export const buildDecorations = (
    args: BuildDecorationsArgs,
) => {
    const {
        doc,
        characterColorSaturation,
        colorByCharacterId,
        rememberedColorByKey,
        persistentCharacters,
        selectionFrom,
    } = args;
    const decorations: Decoration[] = [];
    const colorState = buildCharacterDocColorState({
        doc,
        selectionFrom,
        persistentCharacters,
        characterColorSaturation,
        colorByCharacterId,
        rememberedColorByKey,
    });

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
        const blockId = resolveCharacterBlockId(node.attrs.id, pos);

        tokens.forEach((token, index) => {
            if (token.valueStart < token.valueEnd) {
                const key = normalizeCharacterKey(token.value);
                const colorTokenKey = getCharacterTokenColorKey(blockId, index);
                const color = colorState.colorByToken.get(colorTokenKey)
                    ?? getUnconfirmedCharacterColor(key, characterColorSaturation);
                const decorationEnd = Math.max(token.valueEnd, token.end);

                decorations.push(Decoration.inline(
                    blockStart + token.valueStart,
                    blockStart + decorationEnd,
                    {
                        class: styles.characterTag,
                        style: `--character-tag-color: var(${getCharacterColorVarName(colorTokenKey)}, ${color});`,
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
