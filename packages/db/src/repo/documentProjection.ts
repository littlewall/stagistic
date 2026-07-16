import {
    SCRIPT_DOCUMENT_SCHEMA_VERSION,
    type ScriptDocument,
} from '@stagistic/script';
import {eq} from 'drizzle-orm';

import {
    type ExtractedBlockRow,
    extractScriptBlocks,
    rebuildScriptDocumentFromBlocks,
} from '../blocks';
import * as dbQueries from '../queries';
import {
    type DbClient,
    generateBlockOrderKeys,
} from '../queries';
import {
    scriptActs,
    scriptBlocks,
    scriptCues,
    scriptScenes,
} from '../schema';
import {createDocumentPersister} from './persist/persistDocumentDelta';
import type {GetDb} from './types';

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

export interface RebuildScriptProjectionArgs extends SaveScriptDocumentOptions {
    db: DbClient,
    scriptId: string,
    document: ScriptDocument,
}

const toCharacterRefRows = (block: ExtractedBlockRow, knownCharacterIds: Set<string>) => {
    return Object.entries(block.characterRefByKey)
        .filter(([, characterId]) => knownCharacterIds.has(characterId))
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([characterKey, characterId]) => ({
            characterId, characterKey, isConfirmed: true,
        }));
};

export const loadScriptDocumentFromProjection = async (
    db: DbClient,
    scriptId: string,
): Promise<LoadedProjectionDocument | null> => {
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

export const rebuildScriptProjection = async ({
    db,
    scriptId,
    document,
    afterPersist,
}: RebuildScriptProjectionArgs): Promise<void> => {
    const now = Date.now();
    const extracted = extractScriptBlocks(scriptId, document);
    const orderKeys = generateBlockOrderKeys(extracted.blocks.length);
    const orderKeyById = new Map(extracted.blocks.map((block, index) => [block.blockId, orderKeys[index]]));
    const sceneIdByHeading = new Map(extracted.scenes.map(scene => [scene.headingBlockId, scene.id]));
    const actIdByHeading = new Map(extracted.acts.map(act => [act.headingBlockId, act.id]));

    await db.transaction(async tx => {
        const existingActs = await tx.select({id: scriptActs.id}).from(scriptActs).where(eq(scriptActs.scriptId, scriptId));
        const existingScenes = await tx.select().from(scriptScenes).where(eq(scriptScenes.scriptId, scriptId));
        const existingBlocks = await tx.select({id: scriptBlocks.id}).from(scriptBlocks).where(eq(scriptBlocks.scriptId, scriptId));
        const existingCues = await tx.select({id: scriptCues.id}).from(scriptCues).where(eq(scriptCues.scriptId, scriptId));
        const knownCharacters = await dbQueries.listScriptCharacters(tx, scriptId);

        const nextActIds = new Set(extracted.acts.map(act => act.id));

        await dbQueries.bulkUpsertScriptActs(tx, extracted.acts.map(act => ({
            id: act.id,
            scriptId,
            headingBlockId: act.headingBlockId,
            name: act.name,
            createdAt: now,
            updatedAt: now,
        })));
        await dbQueries.bulkDeleteScriptActs(tx, existingActs.filter(act => !nextActIds.has(act.id)).map(act => act.id));

        /*
         * Scene rows are hybrid rows: heading identity/ordering is projection-owned,
         * while color/synopsis/location are user metadata. Rebuild must refresh the
         * projection fields without erasing metadata for surviving heading blocks.
         */
        const existingSceneByHeading = new Map(
            existingScenes
                .filter(scene => scene.headingBlockId)
                .map(scene => [scene.headingBlockId as string, scene] as const),
        );
        const nextSceneIds = new Set(extracted.scenes.map(scene => scene.id));

        await dbQueries.bulkUpsertScriptScenes(tx, extracted.scenes.map(scene => {
            const prev = existingSceneByHeading.get(scene.headingBlockId) ?? null;

            return {
                id: scene.id,
                scriptId,
                headingBlockId: scene.headingBlockId,
                sceneNumber: scene.sceneNumber,
                colorHex: prev?.colorHex ?? null,
                synopsis: prev?.synopsis ?? null,
                locationId: prev?.locationId ?? null,
                createdAt: prev?.createdAt ?? now,
                updatedAt: now,
            };
        }));
        await dbQueries.bulkDeleteScriptScenes(
            tx,
            existingScenes.filter(scene => !nextSceneIds.has(scene.id)).map(scene => scene.id),
        );

        const nextBlockIds = new Set(extracted.blocks.map(block => block.blockId));

        await dbQueries.bulkDeleteScriptBlocks(
            tx,
            existingBlocks.filter(block => !nextBlockIds.has(block.id)).map(block => block.id),
        );
        await dbQueries.bulkUpsertScriptBlocks(tx, extracted.blocks.map(block => ({
            id: block.blockId,
            scriptId,
            blockType: block.blockType,
            blockOrder: orderKeyById.get(block.blockId) ?? '',
            textContent: block.textContent,
            contentJson: block.contentJson,
            sceneId: block.sceneHeadingBlockId ? sceneIdByHeading.get(block.sceneHeadingBlockId) ?? null : null,
            actId: block.actHeadingBlockId ? actIdByHeading.get(block.actHeadingBlockId) ?? null : null,
            createdAt: now,
            updatedAt: now,
        })));

        const knownCharacterIds = new Set(knownCharacters.map(character => character.id));

        await dbQueries.bulkReplaceScriptBlockCharacterRefs(tx, extracted.blocks.map(block => ({
            blockId: block.blockId,
            rows: toCharacterRefRows(block, knownCharacterIds),
        })));

        const nextCueIds = new Set(extracted.cues.map(cue => cue.id));

        await dbQueries.bulkUpsertScriptCues(tx, extracted.cues.map(cue => ({
            id: cue.id,
            scriptId,
            sceneNumber: cue.sceneNumber,
            indexInScene: cue.indexInScene,
            mode: cue.mode,
            title: cue.title,
            kind: cue.kind,
            startBlockId: cue.startBlockId,
            endBlockId: cue.endBlockId,
            createdAt: now,
            updatedAt: now,
        })));
        await dbQueries.bulkUnassignScriptCues(
            tx,
            existingCues.filter(cue => !nextCueIds.has(cue.id)).map(cue => cue.id),
            now,
        );

        if (afterPersist) {
            await afterPersist(tx);
        }
    });
};

export const createSqlScriptDocumentProjectionWriter = ({
    getDb,
}: CreateSqlScriptDocumentProjectionWriterArgs): ScriptDocumentProjectionWriter => {
    const persisters = new Map<string, ReturnType<typeof createDocumentPersister>>();

    const getPersister = (scriptId: string) => {
        let persister = persisters.get(scriptId);

        if (!persister) {
            persister = createDocumentPersister(scriptId);
            persisters.set(scriptId, persister);
        }

        return persister;
    };

    const seedBaseline: ScriptDocumentProjectionWriter['seedBaseline'] = (
        scriptId,
        document,
        orderKeyByBlockId,
    ) => {
        const baseline = extractScriptBlocks(scriptId, document);

        getPersister(scriptId).setBaseline(baseline.blocks, orderKeyByBlockId);
    };

    const updateFromDocument: ScriptDocumentProjectionWriter['updateFromDocument'] = async (
        scriptId,
        document,
        options,
    ) => {
        const db = await getDb();

        await getPersister(scriptId).persist(db, document, options?.afterPersist);
    };

    const rebuildFromDocument: ScriptDocumentProjectionWriter['rebuildFromDocument'] = async (
        scriptId,
        document,
        options,
    ) => {
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

export const createProjectedTableDocumentSource = ({
    getDb,
    projectionWriter,
}: CreateProjectedTableDocumentSourceArgs): ScriptDocumentSource => {
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
