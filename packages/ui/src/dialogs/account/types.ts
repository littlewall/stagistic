/** A script changed on this device and in the cloud since the last sync. */
export interface CloudConflictItem {
    scriptId: string,
    title: string,
    differingScenes: number,
    localUpdatedAt: number,
    cloudUpdatedAt: number,
    newer: 'local' | 'cloud',
}

export type CloudConflictResolution = 'keep-both' | 'use-newer';

export interface CloudSyncSummary {
    upload: number,
    download: number,
    delete: number,
}

/** Signed-in account as shown in the header menu. */
export interface AccountMenuAccount {
    /** null = not signed in. */
    email: string | null,
    onSignIn: () => void,
    onSignOut: () => void,
    onOpenAccountSettings: () => void,
}

/** A passkey of the signed-in account. */
export interface PasskeyItem {
    id: string,
    name: string | null,
    createdAt: number,
    backedUp: boolean,
}

export const formatSyncTime = (ms: number) => new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'}).format(ms);
