import type {SqlMigration} from '../migrate';
import {BETTER_AUTH_0001} from './0001_better_auth';

export const IDENTITY_MIGRATIONS: readonly SqlMigration[] = [{id: '0001_better_auth', sql: BETTER_AUTH_0001}];
