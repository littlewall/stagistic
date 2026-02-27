import {
    migrateLegacyJsonToBlocksForScript,
    type RewriteBlocksMigrationAudit,
} from '@stagistic/db';
import {
    convertDefaultScriptDocumentToLegacy,
    type ScriptDocument,
} from '@stagistic/script-core';

export const LEGACY_TO_BLOCKS_TRIGGERS = {
    createScript: 'create-script',
    saveLatest: 'save-latest',
} as const;

export type LegacyToBlocksTrigger = (typeof LEGACY_TO_BLOCKS_TRIGGERS)[keyof typeof LEGACY_TO_BLOCKS_TRIGGERS];

interface MigrateScriptDocumentToBlocksArgs {
    db: Parameters<typeof migrateLegacyJsonToBlocksForScript>[0],
    scriptId: string,
    sourceDocument: ScriptDocument,
    trigger: LegacyToBlocksTrigger,
    context: string,
}

const logMigrationAudit = (context: string, audit: RewriteBlocksMigrationAudit) => {
    const baseMessage = `[db-local] ${context} script=${audit.scriptId} status=${audit.status}`;

    if (audit.status === 'failed') {
        console.warn(baseMessage, audit.error ?? 'unknown migration error');

        return;
    }

    console.info(baseMessage);

    audit.warnings.forEach(warning => {
        console.warn(`[db-local] ${warning}`);
    });
};

export const migrateScriptDocumentToBlocks = async ({
    db,
    scriptId,
    sourceDocument,
    trigger,
    context,
}: MigrateScriptDocumentToBlocksArgs) => {
    const legacyDocument = convertDefaultScriptDocumentToLegacy(sourceDocument);
    const audit = await migrateLegacyJsonToBlocksForScript(db, scriptId, {
        sourceDocument: legacyDocument,
        force: true,
        trigger,
    });

    logMigrationAudit(context, audit);

    if (audit.status === 'failed') {
        throw new Error(audit.error ?? `Block migration failed for script ${scriptId}`);
    }

    return audit;
};
