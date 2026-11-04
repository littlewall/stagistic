import type {InferSelectModel} from 'drizzle-orm';

import type {ReactiveQuerySource} from '../reactive';
import type {scriptSceneCharacters} from '../schema';

export type ScriptSceneCharacter = InferSelectModel<typeof scriptSceneCharacters>;

export interface SceneCharacterInput {
    note?: string | null,
    arcValue?: number | null,
    /** Omitted: a new record is on the card and an existing one keeps its state. */
    onCard?: boolean,
}

export interface ScriptSceneSynopsis {
    headingBlockId: string,
    synopsis: string | null,
}

export interface ScriptSceneMetadataRepository {
    getScriptSceneCharactersSource(scriptId: string): ReactiveQuerySource<ScriptSceneCharacter>,
    getScriptSceneSynopsesSource(scriptId: string): ReactiveQuerySource<ScriptSceneSynopsis>,
    listSceneCharacters(scriptId: string): Promise<ScriptSceneCharacter[]>,
    putSceneCharacter(scriptId: string, headingBlockId: string, characterId: string, input: SceneCharacterInput): Promise<ScriptSceneCharacter | null>,
    removeSceneCharacter(scriptId: string, headingBlockId: string, characterId: string): Promise<void>,
    updateSceneSynopsis(scriptId: string, headingBlockId: string, synopsis: string | null): Promise<boolean>,

}
