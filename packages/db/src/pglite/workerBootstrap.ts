import type {PGlite} from '@electric-sql/pglite';
import {live} from '@electric-sql/pglite/live';
import {PGliteWorker} from '@electric-sql/pglite/worker';
import {requireValue} from '@stagistic/shared';
import {drizzle} from 'drizzle-orm/pglite';

import {dbSchema} from '../schema';
import {
    BOOT_STAGE_UPDATES,
    type BootStage,
    OPENING_UPDATE,
} from './bootStages';
import type {
    DbDumpCompression,
    LocalDb,
    PgliteBootstrap,
} from './bootstrapTypes';
import type {DbGeneration} from './dbGeneration';
import {createDbGuard, sleep} from './dbGuard';
import {createDatabaseHandover} from './dbHandover';
import {watchWorkerStart} from './workerStart';

interface WorkerBootstrapOptions {
    dataDir: string,
    workerFactory: () => Worker,
    workerId?: string,
    generation: DbGeneration,
    handoverTimeoutMs?: number,
    handoverSaveTimeoutMs?: number,
}

const FOLLOWER_CHECK_MS = 500;
const LAST_FLUSH_TIMEOUT_MS = 5000;

export const createWorkerBootstrap = ({
    dataDir,
    workerFactory,
    workerId,
    generation,
    handoverTimeoutMs,
    handoverSaveTimeoutMs,
}: WorkerBootstrapOptions): PgliteBootstrap => {
    const {
        handover,
        run: runHandover,
        reportLost,
    } = createDatabaseHandover(handoverSaveTimeoutMs);
    let dbPromise: Promise<LocalDb> | null = null;
    let workerInstanceRef: PGliteWorker | null = null;
    /*
     * Not PGliteWorker's `isLeader`: it starts listening for leader-now only
     * after an await of its own, so a real leader can stay false for good.
     * Only a leader's worker runs `init`, which reports these stages. That
     * also covers a follower elected later, so this watch stays on.
     */
    let isOwnWorkerLeader = false;
    let stopListening = () => {};
    const stageListeners = new Set<(stage: BootStage) => void>();
    const notifyStage = (stage: BootStage) => stageListeners.forEach(listener => listener(stage));
    const guard = !workerId && dataDir.startsWith('idb://')
        ? createDbGuard({
            dataDir,
            generation,
            handoverTimeoutMs,
        })
        : null;
    const leaderId = workerId ?? guard?.workerId;

    /*
     * A follower hears nothing from its worker while the leader, in another
     * tab, opens or migrates the database. That can take minutes and is no stall.
     */
    const watchForOtherLeader = () => {
        const timer = setInterval(() => {
            void guard?.hasLeader().then(hasLeader => {
                if (hasLeader && !isOwnWorkerLeader) {
                    notifyStage('waiting-for-leader');
                }
            });
        }, FOLLOWER_CHECK_MS);

        return () => clearInterval(timer);
    };

    /*
     * Resolves once the leader worker has opened and migrated the database.
     * PGliteWorker.create alone settles earlier, before the leader is up,
     * and a failed leader would otherwise look like a query that never returns.
     */
    const openWorker = async (): Promise<LocalDb> => {
        const worker = workerFactory();
        const watch = watchWorkerStart(worker, stage => {
            isOwnWorkerLeader = true;
            notifyStage(stage);

            // A worker error after this point is no failed start, and the database is working.
            if (stage === 'ready') {
                watch.stop();
            }
        });
        let stopLeaderWatch = () => {};

        try {
            const workerInstance = await Promise.race([
                PGliteWorker.create(worker, {
                    dataDir,
                    extensions: {live},
                    relaxedDurability: true,
                    ...leaderId ? {id: leaderId} : {},
                }),
                watch.failed,
            ]);

            workerInstanceRef = workerInstance;
            stopLeaderWatch = watchForOtherLeader();
            await Promise.race([workerInstance.waitReady, watch.failed]);

            /*
             * A follower opens the database only when it is elected, long after
             * its own start. Holding the election while unable to open would
             * leave every tab of this generation waiting for good.
             */
            watch.failed.catch((error: unknown) => {
                console.error('[db] Taking over the database failed.', error);
                reportLost();
                void close();
            });

            return drizzle({
                client: workerInstance as unknown as PGlite,
                schema: dbSchema,
            });
        } catch (error) {
            // Releases the leader election so a healthy tab can take over.
            if (workerInstanceRef) {
                /*
                 * `close` (not `terminate`) also clears `#closed`, stops the tab-here
                 * loop and drops the tab-close lock while the failure screen is up.
                 */
                void workerInstanceRef.close();
            } else {
                worker.terminate();
            }

            watch.stop();
            throw error;
        } finally {
            stopLeaderWatch();
        }
    };

    // Queries wait for writes in flight, so the flush behind this one covers them.
    const syncCommittedWrites = async () => {
        const client = requireValue(workerInstanceRef);

        await client.query('SELECT 1');
        await client.syncToFs();
    };

    const close = async () => {
        stopListening();
        await workerInstanceRef?.close();
        guard?.leave();
    };

    /*
     * Tabs of a generation stop together, in this order:
     *
     * 1. Each tab, once saved, gives up its tab lock and keeps its worker.
     *    No worker stops before every tab has saved. This began as the way
     *    around PGlite keeping a lock granted to a tab that had closed. Our
     *    patch releases such a lock now, but nothing has shown the order to be
     *    unnecessary, so it stays.
     * 2. Followers stop.
     * 3. The leader stops last, or the next follower would be elected and
     *    reopen the database.
     *
     * A leader closed by hand mid-way does elect a follower; its save is retried.
     */
    const leaveDatabase = async () => {
        guard?.leave();
        await guard?.waitForOtherTabs();

        if (isOwnWorkerLeader) {
            await guard?.waitForFollowers();

            // Everything confirmed is stored by now; this only catches writes still in flight.
            const lastFlush = requireValue(workerInstanceRef).syncToFs().catch((error: unknown) => {
                console.error('[db] Last flush before handover failed.', error);
            });

            // A call can stay unanswered for good when a leader was replaced; that must not keep the database.
            await Promise.race([lastFlush, sleep(LAST_FLUSH_TIMEOUT_MS)]);
        }

        await close();
    };

    const getLocalDb = async (): Promise<LocalDb> => {
        if (!dbPromise) {
            dbPromise = (async () => {
                if (guard) {
                    await guard.enter(notifyStage);
                    notifyStage('opening');
                    stopListening = guard.onHandoverRequest(() => {
                        void runHandover({
                            whenStarted: getLocalDb,
                            syncToStorage: syncCommittedWrites,
                            leaveDatabase,
                        });
                    });
                }

                try {
                    return await openWorker();
                } catch (error) {
                    stopListening();
                    guard?.leave();
                    throw error;
                }
            })();
        }

        return dbPromise;
    };

    const syncToFs = async () => {
        if (!workerInstanceRef) {
            await getLocalDb();
        }

        await workerInstanceRef?.syncToFs();
    };

    const dumpDataDir = async (compression?: DbDumpCompression): Promise<Blob> => {
        if (!workerInstanceRef) {
            await getLocalDb();
        }

        return requireValue(workerInstanceRef).dumpDataDir(compression);
    };

    return {
        getLocalDb,
        syncToFs,
        dumpDataDir,
        handover,
        close,
        runMigrations: async () => {
            await getLocalDb();
        },
        prepareLocalDb: async () => {
            await getLocalDb();
        },
        prepareLocalDbWithProgress: async onProgress => {
            onProgress(OPENING_UPDATE);

            const reportStage = (stage: BootStage) => onProgress(BOOT_STAGE_UPDATES[stage]);

            stageListeners.add(reportStage);

            try {
                await getLocalDb();
            } finally {
                stageListeners.delete(reportStage);
            }

            onProgress({
                step: 'ready',
                label: 'Database ready',
                progress: 1,
            });
        },
    };
};
