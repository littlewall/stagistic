import type {CloudStatus} from '@stagistic/sync-engine';

/** Signed-in sync state for the header indicator; undefined = not signed in (local saving only). */
export const cloudSyncLabel = (status: CloudStatus | null): string | undefined => {
    const labels: Record<CloudStatus['state'], string | undefined> = {
        'signed-out': undefined,
        'needs-check': 'Checking your account…',
        checking: 'Checking your account…',
        syncing: 'Syncing…',
        synced: 'Synced to your account',
        offline: 'Offline — saved on this device',
        error: 'Sync paused',
    };

    return status ? labels[status.state] : undefined;
};
