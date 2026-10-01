import type {PersistentCharacterRef} from '../contracts';
import type {CharacterColorResolvers} from './characterColorPolicy';
import {createCharacterColorResolvers, getUnconfirmedCharacterColor} from './characterColorPolicy';
import {
    type ActiveCharacterToken,
    type CharacterTokenEntry,
    type CharacterTokenScanResult,
    getCharacterTokenColorKey,
} from './characterTokenScan';
import {normalizePersistentCharacterRefs} from './persistentRefNormalization';

export interface CharacterDocColorState {
    colorByToken: ReadonlyMap<string, string>,
    displayColorByKey: ReadonlyMap<string, string>,
}

interface BuildCharacterDocColorStateFromTokenScanArgs {
    tokenScan: CharacterTokenScanResult,
    persistentCharacters?: readonly PersistentCharacterRef[],
    colorByCharacterId?: ReadonlyMap<string, string>,
    rememberedColorByKey?: ReadonlyMap<string, string>,
}

const resolveTokenBaseColor = (
    tokenEntry: CharacterTokenEntry,
    unconfirmedDraftColorByKey: ReadonlyMap<string, string>,
    resolvers: CharacterColorResolvers,
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

    return rememberedColor ?? unconfirmedDraftColorByKey.get(tokenEntry.key) ?? getUnconfirmedCharacterColor(tokenEntry.key);
};

const buildUnconfirmedDraftColorByKey = (tokenEntries: readonly CharacterTokenEntry[], resolvers: CharacterColorResolvers): ReadonlyMap<string, string> => {
    const unconfirmedDraftColorByKey = new Map<string, string>();

    tokenEntries.forEach(tokenEntry => {
        if (!tokenEntry.key || tokenEntry.characterId || unconfirmedDraftColorByKey.has(tokenEntry.key)) {
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

        unconfirmedDraftColorByKey.set(tokenEntry.key, resolvers.resolveDraftTokenColor(tokenEntry.blockId, tokenEntry.tokenIndex));
    });

    return unconfirmedDraftColorByKey;
};

const buildBaseDisplayColorByKey = (
    tokenEntries: readonly CharacterTokenEntry[],
    unconfirmedDraftColorByKey: ReadonlyMap<string, string>,
    resolvers: CharacterColorResolvers,
) => {
    const displayColorByKey = new Map<string, string>();

    tokenEntries.forEach(tokenEntry => {
        if (!tokenEntry.key || displayColorByKey.has(tokenEntry.key)) {
            return;
        }

        displayColorByKey.set(tokenEntry.key, resolveTokenBaseColor(tokenEntry, unconfirmedDraftColorByKey, resolvers));
    });

    return displayColorByKey;
};

interface ResolveActiveTokenColorArgs {
    activeToken: ActiveCharacterToken | null,
    tokenCountByKey: ReadonlyMap<string, number>,
    baseDisplayColorByKey: ReadonlyMap<string, string>,
    resolvers: CharacterColorResolvers,
}

const resolveActiveTokenColor = ({
    activeToken,
    tokenCountByKey,
    baseDisplayColorByKey,
    resolvers,
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
            return baseDisplayColorByKey.get(activeToken.key) ?? getUnconfirmedCharacterColor(activeToken.key);
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
}

const buildColorByToken = ({
    tokenEntries,
    activeToken,
    activeTokenColor,
    unconfirmedDraftColorByKey,
    resolvers,
}: BuildColorByTokenArgs) => {
    const colorByToken = new Map<string, string>();

    tokenEntries.forEach(tokenEntry => {
        const tokenColorKey = getCharacterTokenColorKey(tokenEntry.blockId, tokenEntry.tokenIndex);
        let color = resolveTokenBaseColor(tokenEntry, unconfirmedDraftColorByKey, resolvers);

        if (activeToken && activeToken.id === tokenColorKey && activeTokenColor) {
            color = activeTokenColor;
        }

        colorByToken.set(tokenColorKey, color);
    });

    return colorByToken;
};

export const buildCharacterDocColorStateFromTokenScan = ({
    tokenScan,
    persistentCharacters = [],
    colorByCharacterId,
    rememberedColorByKey,
}: BuildCharacterDocColorStateFromTokenScanArgs): CharacterDocColorState => {
    const normalizedPersistentCharacters = normalizePersistentCharacterRefs(persistentCharacters);
    const resolvers = createCharacterColorResolvers({
        normalizedPersistentCharacters,
        colorByCharacterId,
        rememberedColorByKey,
    });
    const {
        tokenEntries,
        tokenCountByKey,
        activeToken,
    } = tokenScan;
    const unconfirmedDraftColorByKey = buildUnconfirmedDraftColorByKey(tokenEntries, resolvers);
    const baseDisplayColorByKey = buildBaseDisplayColorByKey(tokenEntries, unconfirmedDraftColorByKey, resolvers);
    const activeTokenColor = resolveActiveTokenColor({
        activeToken,
        tokenCountByKey,
        baseDisplayColorByKey,
        resolvers,
    });
    const colorByToken = buildColorByToken({
        tokenEntries,
        activeToken,
        activeTokenColor,
        unconfirmedDraftColorByKey,
        resolvers,
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
