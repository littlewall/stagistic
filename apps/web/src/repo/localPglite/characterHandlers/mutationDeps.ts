import type {
    GetDb,
    RecordOutbox,
} from '../types';

export interface CharacterMutationDeps {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
}
