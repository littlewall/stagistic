import {readFileSync} from 'node:fs';
import path from 'node:path';

import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    compareDbGenerations,
    currentDbGeneration,
    type DbGeneration,
    dbTabLockName,
    dbWorkerId,
    inspectDbLocks,
} from './dbGeneration';

const DATA_DIR = 'idb://stagistic-main';
const mine: DbGeneration = {
    migrationCount: 33,
    latestMigrationId: '20261103094608_scene_arc_range_on_card',
    pgliteVersion: '0.3.15',
};
const older: DbGeneration = {
    migrationCount: 32,
    latestMigrationId: '20261029155540_pdf_flow_settings',
    pgliteVersion: '0.3.15',
};
const newer: DbGeneration = {
    migrationCount: 34,
    latestMigrationId: '20261201000000_next',
    pgliteVersion: '0.3.15',
};

const LEGACY_LEADER = 'pglite-election-lock:https://app.stagistic.com/assets/pglite.worker-Ab12.js:idb://stagistic-main';
const electionLock = (generation: DbGeneration) => `pglite-election-lock:${dbWorkerId(generation, DATA_DIR)}`;
const lock = (name: string): LockInfo => ({name, mode: 'exclusive'});
const inspect = (snapshot: LockManagerSnapshot) => inspectDbLocks(snapshot, {dataDir: DATA_DIR, generation: mine});

describe('database generations', () => {
    it('orders by the number of migrations, which only ever grows', () => {
        expect(compareDbGenerations(older, mine)).toBeLessThan(0);
        expect(compareDbGenerations(newer, mine)).toBeGreaterThan(0);
        expect(compareDbGenerations(mine, {...mine})).toBe(0);
    });

    it('treats a merged migration with an earlier timestamp as newer', () => {
        expect(compareDbGenerations({...mine, migrationCount: 34}, mine)).toBeGreaterThan(0);
    });

    it('breaks a tie on migrations with the PGlite version, compared numerically', () => {
        expect(compareDbGenerations({...mine, pgliteVersion: '0.3.9'}, mine)).toBeLessThan(0);
        expect(compareDbGenerations({...mine, pgliteVersion: '0.4.0'}, mine)).toBeGreaterThan(0);
    });

    it('never ranks two different generations equal', () => {
        expect(compareDbGenerations({...mine, latestMigrationId: '20261103094609_other'}, mine)).toBeGreaterThan(0);
    });

    it('derives from the compiled migrations and the installed PGlite', () => {
        const packageJson = path.resolve(import.meta.dirname, '../../node_modules/@electric-sql/pglite/package.json');
        const {version} = JSON.parse(readFileSync(packageJson, 'utf8')) as {version: string};

        expect(currentDbGeneration.pgliteVersion).toBe(version);
        expect(currentDbGeneration.migrationCount).toBeGreaterThanOrEqual(33);
        expect(currentDbGeneration.latestMigrationId).toMatch(/^\d{14}_/u);
    });

    it('gives builds of one generation the same worker id, whatever their worker URL', () => {
        expect(dbWorkerId({...mine}, DATA_DIR)).toBe(dbWorkerId(mine, DATA_DIR));
        expect(dbWorkerId(mine, DATA_DIR)).not.toBe(dbWorkerId(newer, DATA_DIR));
        expect(dbWorkerId(mine, DATA_DIR)).not.toBe(dbWorkerId(mine, 'idb://other'));
    });
});

describe('reading the locks on a database', () => {
    it('finds nothing when no other generation is there', () => {
        expect(inspect({held: [], pending: []})).toEqual({older: false, newer: false});
        expect(inspect({
            held: [lock(electionLock(mine)), lock(dbTabLockName(mine, DATA_DIR))],
            pending: [lock(electionLock(mine))],
        })).toEqual({older: false, newer: false});
    });

    it('counts today\'s URL-based leader and followers as older', () => {
        expect(inspect({held: [lock(LEGACY_LEADER)], pending: []})).toEqual({older: true, newer: false});
        expect(inspect({held: [], pending: [lock(LEGACY_LEADER)]})).toEqual({older: true, newer: false});
    });

    it('ranks the leader, followers and tabs of another generation', () => {
        expect(inspect({held: [lock(electionLock(older))], pending: []})).toEqual({older: true, newer: false});
        expect(inspect({held: [], pending: [lock(electionLock(older))]})).toEqual({older: true, newer: false});
        expect(inspect({held: [lock(dbTabLockName(older, DATA_DIR))], pending: []})).toEqual({older: true, newer: false});
        expect(inspect({held: [lock(dbTabLockName(newer, DATA_DIR))], pending: []})).toEqual({older: false, newer: true});
        expect(inspect({held: [lock(electionLock(older)), lock(electionLock(newer))]})).toEqual({older: true, newer: true});
    });

    it('never mistakes a snapshot view or another database for a holder', () => {
        expect(inspect({
            held: [
                lock('pglite-election-lock:stagistic-snapshot-view:0192-abc'),
                lock('pglite-election-lock:https://app.stagistic.com/assets/pglite.worker-Ab12.js:memory://'),
                lock('pglite-election-lock:https://app.stagistic.com/assets/pglite.worker-Ab12.js:idb://other'),
                lock('pglite-tab-close:0192-abc'),
                lock(dbTabLockName(older, 'idb://other')),
            ],
            pending: [],
        })).toEqual({older: false, newer: false});
    });

    it('treats a generation it cannot read as newer, so it never asks it to hand over', () => {
        expect(inspect({held: [lock(`pglite-election-lock:stagistic-db:v2-format:${DATA_DIR}`)], pending: []}))
            .toEqual({older: false, newer: true});
    });
});
