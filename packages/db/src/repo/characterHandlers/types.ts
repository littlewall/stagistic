import type {ScriptRepository} from '../../scriptRepository';
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
    | 'setScriptCharacterOutline'
    | 'upsertScriptCharacterGender'
>;

export interface CreateCharacterHandlersArgs {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
    syncDb: () => Promise<void>,
}
