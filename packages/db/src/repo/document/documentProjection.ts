import {SCRIPT_DOCUMENT_SCHEMA_VERSION, type ScriptDocument} from '@stagistic/script';

import {extractScriptBlocks, rebuildScriptDocumentFromBlocks} from '../../blocks';
import * as dbQueries from '../../queries';
import {type DbClient} from '../../queries';
import type {GetDb} from '../types';
import {createDocumentPersister} from './persist/persistDocumentDelta';
import {rebuildScriptProjection} from './rebuildScriptProjection';

export type {RebuildScriptProjectionArgs} from './rebuildScriptProjection';
export {rebuildScriptProjection} from './rebuildScriptProjection';

export interface LoadedScriptDocument {
    document: ScriptDocument,
    schemaVersion: number,
}

export interface LoadedProjectionDocument extends LoadedScriptDocument {
    orderKeyByBlockId: Map<string, string>,
}

export interface SaveScriptDocumentOptions {
    afterPersist?: (tx: DbClient) => Promise<void>,
}

export interface ScriptDocumentSource {
    load(scriptId: string): Promise<LoadedScriptDocument | null>,
    save(scriptId: string, value: ScriptDocument, options?: SaveScriptDocumentOptions): Promise<void>,
}

export interface ScriptDocumentProjectionWriter {
    seedBaseline(scriptId: string, document: ScriptDocument, orderKeyByBlockId?: Map<string, string>): void,
    updateFromDocument(scriptId: string, document: ScriptDocument, options?: SaveScriptDocumentOptions): Promise<void>,
    rebuildFromDocument(scriptId: string, document: ScriptDocument, options?: SaveScriptDocumentOptions): Promise<void>,
}

interface CreateProjectedTableDocumentSourceArgs {
    getDb: GetDb,
    projectionWriter: ScriptDocumentProjectionWriter,
}

interface CreateSqlScriptDocumentProjectionWriterArgs {
    getDb: GetDb,
}

export const loadScriptDocumentFromProjection = async (db: DbClient, scriptId: string): Promise<LoadedProjectionDocument | null> => {
    const storedBlocks = await dbQueries.listScriptBlocks(db, scriptId);

    if (storedBlocks.length === 0) {
        return null;
    }

    const storedCharacterRefs = await dbQueries.listScriptCharacterRefsByScript(db, scriptId);
    const rebuilt = rebuildScriptDocumentFromBlocks(
        scriptId,
        storedBlocks.map(row => ({
            id: row.id,
            blockType: row.blockType,
            blockOrder: row.blockOrder,
            textContent: row.textContent,
            contentJson: row.contentJson,
        })),
        storedCharacterRefs.map(ref => ({
            blockId: ref.blockId,
            characterKey: ref.characterKey,
            characterId: ref.characterId,
        })),
    );

    rebuilt.warnings.forEach(warning => {
        console.warn(`[db-local] ${warning}`);
    });

    return {
        document: rebuilt.document,
        schemaVersion: SCRIPT_DOCUMENT_SCHEMA_VERSION,
        orderKeyByBlockId: new Map(storedBlocks.map(row => [row.id, row.blockOrder])),
    };
};

export const createSqlScriptDocumentProjectionWriter = ({getDb}: CreateSqlScriptDocumentProjectionWriterArgs): ScriptDocumentProjectionWriter => {
    const persisters = new Map<string, ReturnType<typeof createDocumentPersister>>();

    const getPersister = (scriptId: string) => {
        let persister = persisters.get(scriptId);

        if (!persister) {
            persister = createDocumentPersister(scriptId);
            persisters.set(scriptId, persister);
        }

        return persister;
    };

    const seedBaseline: ScriptDocumentProjectionWriter['seedBaseline'] = (scriptId, document, orderKeyByBlockId) => {
        const baseline = extractScriptBlocks(scriptId, document);

        getPersister(scriptId).setBaseline(baseline.blocks, orderKeyByBlockId);
    };

    const updateFromDocument: ScriptDocumentProjectionWriter['updateFromDocument'] = async (scriptId, document, options) => {
        const db = await getDb();

        await getPersister(scriptId).persist(db, document, options?.afterPersist);
    };

    const rebuildFromDocument: ScriptDocumentProjectionWriter['rebuildFromDocument'] = async (scriptId, document, options) => {
        const db = await getDb();

        await rebuildScriptProjection({
            db,
            scriptId,
            document,
            afterPersist: options?.afterPersist,
        });

        const loaded = await loadScriptDocumentFromProjection(db, scriptId);

        seedBaseline(scriptId, loaded?.document ?? document, loaded?.orderKeyByBlockId);
    };

    return {
        seedBaseline,
        updateFromDocument,
        rebuildFromDocument,
    };
};

export const createProjectedTableDocumentSource = ({getDb, projectionWriter}: CreateProjectedTableDocumentSourceArgs): ScriptDocumentSource => {
    const load: ScriptDocumentSource['load'] = async scriptId => {
        const db = await getDb();
        const loaded = await loadScriptDocumentFromProjection(db, scriptId);

        if (!loaded) {
            return null;
        }

        projectionWriter.seedBaseline(scriptId, loaded.document, loaded.orderKeyByBlockId);

        return {
            document: loaded.document,
            schemaVersion: loaded.schemaVersion,
        };
    };

    const save: ScriptDocumentSource['save'] = async (scriptId, value, options) => {
        await projectionWriter.updateFromDocument(scriptId, value, options);
    };

    return {load, save};
};
