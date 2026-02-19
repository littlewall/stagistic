import type {
    GetDb,
    RecordOutbox,
} from '../types';

export type CharacterMutationDeps = {
    getDb: GetDb,
    recordOutbox: RecordOutbox,
};
