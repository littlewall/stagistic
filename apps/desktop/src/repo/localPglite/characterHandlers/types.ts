import type {ScriptRepository} from '@stagistic/sync-core';

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

export type CreateCharacterHandlersArgs = {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
};
