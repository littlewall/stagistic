import type {PersistentCharacterRef} from '../../../contracts';

export interface CharacterTagComposeRawState {
    from: number,
}

export interface CharacterTagComposeState {
    from: number,
    to: number,
    query: string,
}

export interface CommitCharacterTagPayload {
    name?: string,
    trailingSpace?: boolean,
}

export interface CharacterTagInputExtensionOptions {
    persistentCharactersRef?: {current: readonly PersistentCharacterRef[]},
}
