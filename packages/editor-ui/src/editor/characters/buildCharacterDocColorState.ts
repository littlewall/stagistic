import {type Node as ProseMirrorNode} from '@tiptap/pm/model';

import type {PersistentCharacterRef} from '../contracts';
import type {CharacterColorResolvers} from './characterColorPolicy';
import {
    createCharacterColorResolvers,
    getUnconfirmedCharacterColor,
} from './characterColorPolicy';
import {
    type ActiveCharacterToken,
    type CharacterTokenEntry,
    getCharacterTokenColorKey,
    scanCharacterTokensFromDoc,
} from './characterTokenScan';
import {normalizePersistentCharacterRefs} from './persistentRefNormalization';

export interface CharacterDocColorState {
    colorByToken: ReadonlyMap<string, string>,
    displayColorByKey: ReadonlyMap<string, string>,
}

interface BuildCharacterDocColorStateArgs {
    doc: ProseMirrorNode,
    selectionFrom?: number | null,
    persistentCharacters?: readonly PersistentCharacterRef[],
    characterColorSaturation?: number,
    colorByCharacterId?: ReadonlyMap<string, string>,
    rememberedColorByKey?: ReadonlyMap<string, string>,
}

const resolveTokenBaseColor = (
    tokenEntry: CharacterTokenEntry,
    unconfirmedDraftColorByKey: ReadonlyMap<string, string>,
    resolvers: CharacterColorResolvers,
    characterColorSaturation?: number,
) => {
    if (tokenEntry.characterId) {
        return resolvers.resolveConfirmedColorById(tokenEntry.characterId);
    }

    if (!tokenEntry.key) {
        return resolvers.resolveDraftTokenColor(tokenEntry.blockId, tokenEntry.tokenIndex);
    }

    const persistentCharacter = resolvers.persistentCharacterByKey.get(tokenEntry.key);
    const rememberedColor = resolvers.resolveRememberedColorByKey(tokenEntry.key);

    if (persistentCharacter) {
        return resolvers.resolveConfirmedColorById(persistentCharacter.id);
    }

    return rememberedColor
        ?? unconfirmedDraftColorByKey.get(tokenEntry.key)
        ?? getUnconfirmedCharacterColor(tokenEntry.key, characterColorSaturation);
};

const buildUnconfirmedDraftColorByKey = (
    tokenEntries: readonly CharacterTokenEntry[],
    resolvers: CharacterColorResolvers,
): ReadonlyMap<string, string> => {
    const unconfirmedDraftColorByKey = new Map<string, string>();

    tokenEntries.forEach(tokenEntry => {
        if (
            !tokenEntry.key
            || tokenEntry.characterId
            || unconfirmedDraftColorByKey.has(tokenEntry.key)
        ) {
            return;
        }

        const persistentCharacter = resolvers.persistentCharacterByKey.get(tokenEntry.key);

        if (persistentCharacter) {
            return;
        }

        const rememberedColor = resolvers.resolveRememberedColorByKey(tokenEntry.key);

        if (rememberedColor) {
            unconfirmedDraftColorByKey.set(tokenEntry.key, rememberedColor);

            return;
        }

        unconfirmedDraftColorByKey.set(
            tokenEntry.key,
            resolvers.resolveDraftTokenColor(tokenEntry.blockId, tokenEntry.tokenIndex),
        );
    });

    return unconfirmedDraftColorByKey;
};

const buildBaseDisplayColorByKey = (
    tokenEntries: readonly CharacterTokenEntry[],
    unconfirmedDraftColorByKey: ReadonlyMap<string, string>,
    resolvers: CharacterColorResolvers,
    characterColorSaturation?: number,
) => {
    const displayColorByKey = new Map<string, string>();

    tokenEntries.forEach(tokenEntry => {
        if (!tokenEntry.key || displayColorByKey.has(tokenEntry.key)) {
            return;
        }

        displayColorByKey.set(
            tokenEntry.key,
            resolveTokenBaseColor(
                tokenEntry,
                unconfirmedDraftColorByKey,
                resolvers,
                characterColorSaturation,
            ),
        );
    });

    return displayColorByKey;
};

interface ResolveActiveTokenColorArgs {
    activeToken: ActiveCharacterToken | null,
    tokenCountByKey: ReadonlyMap<string, number>,
    baseDisplayColorByKey: ReadonlyMap<string, string>,
    resolvers: CharacterColorResolvers,
    characterColorSaturation?: number,
}

const resolveActiveTokenColor = ({
    activeToken,
    tokenCountByKey,
    baseDisplayColorByKey,
    resolvers,
    characterColorSaturation,
}: ResolveActiveTokenColorArgs): string | null => {
    if (!activeToken) {
        return null;
    }

    if (activeToken.characterId) {
        return resolvers.resolveConfirmedColorById(activeToken.characterId);
    }

    if (activeToken.key) {
        const persistentCharacter = resolvers.persistentCharacterByKey.get(activeToken.key);

        if (persistentCharacter) {
            return resolvers.resolveConfirmedColorById(persistentCharacter.id);
        }

        const rememberedColor = resolvers.resolveRememberedColorByKey(activeToken.key);

        if (rememberedColor) {
            return rememberedColor;
        }

        const hasOtherTokens = (tokenCountByKey.get(activeToken.key) ?? 0) > 1;

        if (hasOtherTokens) {
            return baseDisplayColorByKey.get(activeToken.key)
                ?? getUnconfirmedCharacterColor(activeToken.key, characterColorSaturation);
        }
    }

    return resolvers.resolveDraftTokenColor(activeToken.blockId, activeToken.tokenIndex);
};

interface BuildColorByTokenArgs {
    tokenEntries: readonly CharacterTokenEntry[],
    activeToken: ActiveCharacterToken | null,
    activeTokenColor: string | null,
    unconfirmedDraftColorByKey: ReadonlyMap<string, string>,
    resolvers: CharacterColorResolvers,
    characterColorSaturation?: number,
}

const buildColorByToken = ({
    tokenEntries,
    activeToken,
    activeTokenColor,
    unconfirmedDraftColorByKey,
    resolvers,
    characterColorSaturation,
}: BuildColorByTokenArgs) => {
    const colorByToken = new Map<string, string>();

    tokenEntries.forEach(tokenEntry => {
        const tokenColorKey = getCharacterTokenColorKey(tokenEntry.blockId, tokenEntry.tokenIndex);
        let color = resolveTokenBaseColor(
            tokenEntry,
            unconfirmedDraftColorByKey,
            resolvers,
            characterColorSaturation,
        );

        if (activeToken && activeToken.id === tokenColorKey && activeTokenColor) {
            color = activeTokenColor;
        }

        colorByToken.set(tokenColorKey, color);
    });

    return colorByToken;
};

export const buildCharacterDocColorState = ({
    doc,
    selectionFrom,
    persistentCharacters = [],
    characterColorSaturation,
    colorByCharacterId,
    rememberedColorByKey,
}: BuildCharacterDocColorStateArgs): CharacterDocColorState => {
    const normalizedPersistentCharacters = normalizePersistentCharacterRefs(persistentCharacters);
    const resolvers = createCharacterColorResolvers({
        normalizedPersistentCharacters,
        characterColorSaturation,
        colorByCharacterId,
        rememberedColorByKey,
    });
    const {
        tokenEntries,
        tokenCountByKey,
        activeToken,
    } = scanCharacterTokensFromDoc({
        doc,
        selectionFrom,
    });
    const unconfirmedDraftColorByKey = buildUnconfirmedDraftColorByKey(tokenEntries, resolvers);
    const baseDisplayColorByKey = buildBaseDisplayColorByKey(
        tokenEntries,
        unconfirmedDraftColorByKey,
        resolvers,
        characterColorSaturation,
    );
    const activeTokenColor = resolveActiveTokenColor({
        activeToken,
        tokenCountByKey,
        baseDisplayColorByKey,
        resolvers,
        characterColorSaturation,
    });
    const colorByToken = buildColorByToken({
        tokenEntries,
        activeToken,
        activeTokenColor,
        unconfirmedDraftColorByKey,
        resolvers,
        characterColorSaturation,
    });
    const displayColorByKey = new Map(baseDisplayColorByKey);

    if (activeToken && activeTokenColor && activeToken.key) {
        displayColorByKey.set(activeToken.key, activeTokenColor);
    }

    return {
        colorByToken,
        displayColorByKey,
    };
};
