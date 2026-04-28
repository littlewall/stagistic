import type {Node as ProseMirrorNode} from '@tiptap/pm/model';

import type {PersistentCharacterRef} from '../../../contracts';
import {buildCharacterRuntime} from '../../../runtime/buildCharacterRuntime';
import styles from '../CharacterTagDecorations.module.css';

interface BuildDecorationsArgs {
    doc: ProseMirrorNode,
    characterColorSaturation?: number,
    colorByCharacterId?: ReadonlyMap<string, string>,
    rememberedColorByKey?: ReadonlyMap<string, string>,
    persistentCharacters?: readonly PersistentCharacterRef[],
    selectionFrom?: number | null,
}

export const buildDecorations = ({
    doc,
    characterColorSaturation,
    colorByCharacterId,
    rememberedColorByKey,
    persistentCharacters,
    selectionFrom,
}: BuildDecorationsArgs) => {
    return buildCharacterRuntime({
        doc,
        selectionFrom,
        persistentCharacters,
        characterColorSaturation,
        colorByCharacterId,
        rememberedColorByKey,
        characterTagClassNames: {
            tag: styles.characterTag,
            separator: styles.characterSeparator,
        },
    }).decorations;
};
