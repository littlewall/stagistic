import type {LocalDb} from '../pglite';

export type GetDb = () => Promise<LocalDb>;

export type SyncDb = () => Promise<void>;

