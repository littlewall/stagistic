import type {ScriptRepository} from '../../scriptRepository';
import type {
    GetDb,
    RecordOutbox,
} from '../types';

export type CharacterHandlers = Pick<
    ScriptRepository,
    | 'listScriptCharacterGenders'
    | 'confirmScriptCharacter'
    | 'confirmScriptCharacterWithId'
    | 'deleteScriptCharacter'
    | 'renameScriptCharacter'
    | 'setScriptCharacterColor'
    | 'setScriptCharacterGender'
    | 'setScriptCharacterOutline'
    | 'upsertScriptCharacterGender'
    | 'upsertScriptCharacterGenderWithId'
>;

export type CharacterGroupHandlers = Pick<
    ScriptRepository,
    | 'listScriptCharacterGroups'
    | 'createScriptCharacterGroup'
    | 'createScriptCharacterGroupWithId'
    | 'renameScriptCharacterGroup'
    | 'deleteScriptCharacterGroup'
    | 'setScriptCharacterGroupColor'
    | 'replaceScriptCharacterGroupMembers'
>;

export interface CreateCharacterHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
    syncDb: () => Promise<void>,
}
