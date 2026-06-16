import type {PersistentCharacterRef} from '../../../contracts';

export interface CharacterTagComposeRawState {
    /** Document position where the forming tag starts. */
    from: number,
}

export interface CharacterTagComposeState {
    /** Position where the forming tag starts. */
    from: number,
    /** Current cursor position (end of the compose region). */
    to: number,
    /** Text typed inside the forming tag; the initial placeholder space is excluded. */
    query: string,
}

export interface CommitCharacterTagPayload {
    /** Explicit name to commit (e.g. a chosen overlay suggestion). */
    name?: string,
    /** When true, insert a normal space after the committed pill. */
    trailingSpace?: boolean,
}

export interface CharacterTagInputExtensionOptions {
    persistentCharactersRef?: {current: readonly PersistentCharacterRef[]},
}
