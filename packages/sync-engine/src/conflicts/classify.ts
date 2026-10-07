/*
 * Classification run before the engine reconnects after a sign-out (or on the
 * first sign-in on a device). Pure: callers gather local and cloud facts.
 *
 * - changed locally  = current state vectors != last synced state vectors
 * - changed in cloud = cloud `updatedAt` > `lastSyncedAt` (server clock)
 */

export interface LocalScriptSyncInfo {
    scriptId: string,
    /** Account the script was last synced with; null = never synced. */
    boundAccountId: string | null,
    changedSinceSync: boolean,
    /** Per-script override of the global `lastSyncedAt` (server clock, ms). */
    lastSyncedAt?: number | null,
}

export interface LocalTombstone {
    scriptId: string,
    boundAccountId: string | null,
}

export interface CloudScriptInfo {
    scriptId: string,
    updatedAt: number,
    deletedAt: number | null,
}

export interface ClassifyScriptsInput {
    accountId: string,
    lastSyncedAt: number | null,
    local: readonly LocalScriptSyncInfo[],
    tombstones: readonly LocalTombstone[],
    cloud: readonly CloudScriptInfo[],
}

export interface ScriptSyncPlan {
    /** Local script goes to the cloud (new, or only changed here). */
    upload: string[],
    /** Cloud state comes down (new elsewhere, or only changed there). */
    download: string[],
    /** Deleted here while signed out, untouched in the cloud. */
    deleteCloud: string[],
    /** Deleted in the cloud, untouched here. */
    deleteLocal: string[],
    /** Deleted in the cloud but edited here: edit wins, cloud copy is restored. */
    restoreCloud: string[],
    /** Deleted here but edited in the cloud: edit wins, local copy is restored. */
    restoreLocal: string[],
    /** Changed on both sides: needs a user choice. */
    conflicts: string[],
    /** Bound to another account: stays local, never uploaded. */
    otherAccount: string[],
    unchanged: string[],
}

const createEmptyPlan = (): ScriptSyncPlan => ({
    upload: [],
    download: [],
    deleteCloud: [],
    deleteLocal: [],
    restoreCloud: [],
    restoreLocal: [],
    conflicts: [],
    otherAccount: [],
    unchanged: [],
});

export const classifyScripts = ({
    accountId,
    lastSyncedAt,
    local,
    tombstones,
    cloud,
}: ClassifyScriptsInput): ScriptSyncPlan => {
    const plan = createEmptyPlan();
    const cloudById = new Map(cloud.map(entry => [entry.scriptId, entry]));
    const handled = new Set<string>();

    const isCloudChanged = (entry: CloudScriptInfo, syncedAt: number | null | undefined) => {
        const since = syncedAt === undefined ? lastSyncedAt : syncedAt;

        return since === null || entry.updatedAt > since;
    };

    for (const script of local) {
        handled.add(script.scriptId);

        if (script.boundAccountId !== null && script.boundAccountId !== accountId) {
            plan.otherAccount.push(script.scriptId);
            continue;
        }

        const remote = cloudById.get(script.scriptId);
        const everSynced = script.boundAccountId === accountId;

        if (!remote) {
            plan.upload.push(script.scriptId);
            continue;
        }

        if (remote.deletedAt !== null) {
            (script.changedSinceSync || !everSynced ? plan.restoreCloud : plan.deleteLocal).push(script.scriptId);
            continue;
        }

        const cloudChanged = isCloudChanged(remote, script.lastSyncedAt);

        if (!everSynced || (script.changedSinceSync && cloudChanged)) {
            plan.conflicts.push(script.scriptId);
        } else if (script.changedSinceSync) {
            plan.upload.push(script.scriptId);
        } else if (cloudChanged) {
            plan.download.push(script.scriptId);
        } else {
            plan.unchanged.push(script.scriptId);
        }
    }

    for (const tombstone of tombstones) {
        handled.add(tombstone.scriptId);

        if (tombstone.boundAccountId !== accountId) {
            continue;
        }

        const remote = cloudById.get(tombstone.scriptId);

        if (!remote || remote.deletedAt !== null) {
            continue;
        }

        (isCloudChanged(remote, undefined) ? plan.restoreLocal : plan.deleteCloud).push(tombstone.scriptId);
    }

    for (const remote of cloud) {
        if (!handled.has(remote.scriptId) && remote.deletedAt === null) {
            plan.download.push(remote.scriptId);
        }
    }

    return plan;
};

/**
 * Server clock offset from a response `Date` header: add it to a local
 * timestamp to compare with server timestamps.
 */
export const computeClockOffset = (serverDateHeader: string | null, receivedAtLocalMs: number) => {
    const serverMs = serverDateHeader ? Date.parse(serverDateHeader) : Number.NaN;

    return Number.isFinite(serverMs) ? serverMs - receivedAtLocalMs : 0;
};

export type NewerSide = 'local' | 'cloud';

/** "Use newer": compares local `updatedAt` (corrected to server clock) with cloud `updatedAt`. */
export const pickNewerSide = (localUpdatedAt: number, cloudUpdatedAt: number, clockOffsetMs: number): NewerSide => {
    return localUpdatedAt + clockOffsetMs > cloudUpdatedAt ? 'local' : 'cloud';
};
