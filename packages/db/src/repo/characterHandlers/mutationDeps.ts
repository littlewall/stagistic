import type {
    GetDb,
    RecordOutbox,
} from '../types';

export interface CharacterMutationDeps {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
}

export interface CharacterOutlineMutationDeps extends CharacterMutationDeps {
    syncDb: () => Promise<void>,
}
