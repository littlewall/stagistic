import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    describeStartFailure,
    isStartFailureKind,
    StartFailureError,
    startFailureFromInfo,
} from './startFailure';

describe('start failure', () => {
    it('keeps the kind and migration of a typed failure', () => {
        const error = new StartFailureError('migration-failed', 'boom', {migrationId: '0001_x'});

        expect(describeStartFailure(error)).toEqual({
            kind: 'migration-failed',
            message: 'boom',
            migrationId: '0001_x',
        });
    });

    it('classifies anything else as unknown', () => {
        expect(describeStartFailure(new Error('oops'))).toEqual({kind: 'unknown', message: 'oops'});
        expect(describeStartFailure('plain')).toEqual({kind: 'unknown', message: 'plain'});
    });

    it('rebuilds a typed error from plain data', () => {
        const error = startFailureFromInfo({kind: 'database-newer-than-app', message: 'newer'});

        expect(error).toBeInstanceOf(StartFailureError);
        expect(error.kind).toBe('database-newer-than-app');
    });

    it('recognises only known kinds', () => {
        expect(isStartFailureKind('older-version-running')).toBe(true);
        expect(isStartFailureKind('other')).toBe(false);
    });
});
