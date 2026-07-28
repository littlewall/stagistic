import type {
    RewriteBlocksMigrationAudit,
    RewriteMigrationStatus,
} from './types';

const resolveStatus = (warnings: string[], error: string | null): RewriteMigrationStatus => {
    if (error) {
        return 'failed';
    }

    if (warnings.length > 0) {
        return 'partial';
    }

    return 'success';
};

export const toAudit = (
    scriptId: string,
    trigger: string,
    migratedAt: number,
    legacyBlockCount: number,
    storedBlockCount: number,
    storedCharacterRefCount: number,
    warnings: string[],
    error: string | null,
): RewriteBlocksMigrationAudit => {
    return {
        scriptId,
        trigger,
        status: resolveStatus(warnings, error),
        migratedAt,
        legacyBlockCount,
        storedBlockCount,
        storedCharacterRefCount,
        warnings,
        error,
    };
};
