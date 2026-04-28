import type {ScriptRepository} from '@stagistic/db';

import type {
    GetDb,
    RecordOutbox,
} from '../types';

export type CharacterHandlers = Pick<
    ScriptRepository,
    | 'listScriptCharacterGenders'
    | 'confirmScriptCharacter'
    | 'deleteScriptCharacter'
    | 'renameScriptCharacter'
    | 'setScriptCharacterColor'
    | 'setScriptCharacterGender'
    | 'upsertScriptCharacterGender'
>;

export interface CreateCharacterHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
}
