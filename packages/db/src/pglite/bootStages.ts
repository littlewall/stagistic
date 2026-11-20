import type {DbBootstrapUpdate} from './bootstrapTypes';
import type {DbGuardWait} from './dbGuard';
import type {WorkerStartStage} from './workerStart';

export type BootStage = Exclude<WorkerStartStage, 'failed'> | DbGuardWait | 'waiting-for-leader' | 'opening';

export const OPENING_UPDATE = {
    step: 'client',
    label: 'Starting local database',
    progress: 0.1,
} as const;

const OLDER_VERSION_UPDATE = {
    step: 'client',
    label: 'Waiting for an older version of Stagistic to save',
    progress: 0.1,
    longRunning: true,
} as const;

export const BOOT_STAGE_UPDATES: Record<BootStage, DbBootstrapUpdate> = {
    opening: OPENING_UPDATE,
    'waiting-for-older-version': OLDER_VERSION_UPDATE,
    'blocked-by-older-version': {...OLDER_VERSION_UPDATE, blocked: {kind: 'older-version-running', message: ''}},
    'waiting-for-leader': {
        step: 'client',
        label: 'Waiting for another Stagistic tab',
        progress: 0.2,
        longRunning: true,
        waitsForDatabase: true,
    },
    'loading-assets': {
        step: 'fs-bundle',
        label: 'Loading data bundle',
        progress: 0.35,
    },
    'backing-up': {
        step: 'migrations',
        label: 'Backing up your scripts before updating',
        progress: 0.8,
        longRunning: true,
        waitsForDatabase: true,
    },
    migrating: {
        step: 'migrations',
        label: 'Applying migrations',
        progress: 0.8,
        longRunning: true,
        waitsForDatabase: true,
    },
    ready: {
        step: 'ready',
        label: 'Finalizing database',
        progress: 0.95,
    },
};
