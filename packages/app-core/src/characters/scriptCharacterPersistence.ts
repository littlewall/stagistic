import type {ScriptRepository} from '@stagistic/db';

const pendingByRepository = new WeakMap<ScriptRepository, Map<string, Promise<void>>>();
const keyOf = (scriptId: string, characterId: string) => JSON.stringify([scriptId, characterId]);

/** Shared by catalog confirmation and scene records that need the character's foreign key. */
export const trackCharacterCreation = (
    repository: ScriptRepository,
    scriptId: string,
    characterId: string,
    confirmation: Promise<unknown>,
) => {
    let pending = pendingByRepository.get(repository);

    if (!pending) {
        pending = new Map();
        pendingByRepository.set(repository, pending);
    }

    const key = keyOf(scriptId, characterId);
    const persisted = confirmation.then(() => undefined);

    pending.set(key, persisted);
    void persisted.finally(() => {
        if (pending.get(key) === persisted) pending.delete(key);
    }).catch(() => undefined);
};

export const waitForCharacterCreation = (repository: ScriptRepository, scriptId: string, characterId: string) => {
    return pendingByRepository.get(repository)?.get(keyOf(scriptId, characterId)) ?? Promise.resolve();
};
