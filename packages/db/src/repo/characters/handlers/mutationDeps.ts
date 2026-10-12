import type {GetDb} from '../../types';

export interface CharacterMutationDeps {
    getDb: GetDb,
    syncDb: () => Promise<void>,
}
