import {
    diffRecords,
    type RecordChanges,
    type RecordsKind,
} from '@stagistic/sync-engine';

import type {ScriptRepository} from '../../types/scriptRepository';
import type {GetDb} from '../types';
import {readScriptRecords} from './readScriptRecords';

/*
 * Makes the local repository Y-first for records. Each mutation still runs its
 * own validation and SQL (so reads stay instant), and its effect — the record
 * diff of the projection around it — is mirrored into the script's Y.Doc by
 * the sync engine (three-way, see `applyRecordChanges`). The engine then owns
 * the rows: remote edits and merges are projected by it.
 */

/** Tab side of the engine (`SyncEngineClient` from `@stagistic/sync-engine`). */
export interface ScriptDocumentsSync {
    applyRecordChanges(scriptId: string, kind: RecordsKind, changes: RecordChanges): Promise<void>,
    flushScript(scriptId: string): Promise<void>,
    notifyScriptReplaced(scriptId: string): Promise<void>,
    notifyScriptDeleted(scriptId: string): Promise<void>,
    /** Signed in: fetch an attachment blob this device lacks (`cloud.downloadAttachment`). */
    downloadAttachment?(storageKey: string): Promise<boolean>,
}

interface WithDocumentSyncArgs {
    getDb: GetDb,
    documents: ScriptDocumentsSync,
    log?: (message: string, error?: unknown) => void,
}

const META_MUTATIONS = [
    'createScriptMusic',
    'createScriptMusicWithId',
    'updateScriptMusic',
    'deleteScriptMusic',
    'createScriptLocation',
    'createScriptLocationWithId',
    'renameScriptLocation',
    'deleteScriptLocation',
    'replaceScriptSceneLocations',
    'setMusicAttachment',
    'removeMusicAttachment',
    'renameScript',
    'renameScriptTitle',
    'confirmScriptCharacter',
    'confirmScriptCharacterWithId',
    'createScriptCharacterGroup',
    'createScriptCharacterGroupWithId',
    'deleteScriptCharacter',
    'deleteScriptCharacterGroup',
    'renameScriptCharacter',
    'renameScriptCharacterGroup',
    'setScriptCharacterColor',
    'setScriptCharacterGroupColor',
    'replaceScriptCharacterGroupMembers',
    'setScriptCharacterGender',
    'setScriptCharacterOutline',
    'setScriptCharacterVoiceType',
    'setScriptCharacterVocalRange',
    'upsertScriptCharacterGender',
    'upsertScriptCharacterGenderWithId',
    'saveScriptSettings',
    'deleteScriptSettings',
    'saveTitlePage',
    'deleteTitlePage',
] as const satisfies ReadonlyArray<keyof ScriptRepository>;

const COMMENT_MUTATIONS = [
    'createScriptCommentThread',
    'addScriptCommentMessage',
    'updateScriptCommentMessage',
    'deleteScriptCommentMessage',
    'setScriptCommentThreadStatus',
    'moveScriptCommentBlockAnchors',
    'deleteScriptCommentThread',
    'restoreScriptCommentThread',
] as const satisfies ReadonlyArray<keyof ScriptRepository>;

type ScriptMutation = (scriptId: string, ...args: never[]) => Promise<unknown>;

export const withDocumentSync = (repository: ScriptRepository, {
    getDb,
    documents,
    log = (message, error) => console.error(`[sync-engine] ${message}`, error),
}: WithDocumentSyncArgs): ScriptRepository => {
    const capture = (kind: RecordsKind, mutation: ScriptMutation): ScriptMutation => async (scriptId, ...args) => {
        const before = await readScriptRecords(await getDb(), scriptId, kind);
        const result = await mutation(scriptId, ...args);
        const changes = diffRecords(before, await readScriptRecords(await getDb(), scriptId, kind));

        // The mutation is committed locally; a failed mirror only delays sync.
        await documents.applyRecordChanges(scriptId, kind, changes).catch(error => log(`could not mirror ${kind} changes of ${scriptId}`, error));

        return result;
    };
    const wrapped: Partial<Record<keyof ScriptRepository, unknown>> = {};

    for (const name of META_MUTATIONS) {
        wrapped[name] = capture('meta', repository[name]);
    }

    for (const name of COMMENT_MUTATIONS) {
        wrapped[name] = capture('comments', repository[name]);
    }

    return {
        ...repository,
        ...wrapped as Partial<ScriptRepository>,
        // Copies read the projection: let the engine write pending edits first.
        duplicateScript: async (sourceScriptId, input) => {
            await documents.flushScript(sourceScriptId);

            return repository.duplicateScript(sourceScriptId, input);
        },
        duplicateScriptWithId: async (sourceScriptId, input) => {
            await documents.flushScript(sourceScriptId);

            return repository.duplicateScriptWithId(sourceScriptId, input);
        },
        restoreScriptFromPackage: async input => {
            await repository.restoreScriptFromPackage(input);
            await documents.notifyScriptReplaced(input.script.id);
        },
        // Attachments synced from another device: fetch the blob on first use.
        getAttachmentBlob: async storageKey => {
            const local = await repository.getAttachmentBlob(storageKey);

            if (local || !documents.downloadAttachment || !await documents.downloadAttachment(storageKey).catch(() => false)) {
                return local;
            }

            return repository.getAttachmentBlob(storageKey);
        },
        deleteScript: async scriptId => {
            await repository.deleteScript(scriptId);
            await documents.notifyScriptDeleted(scriptId).catch(error => log(`could not drop local Y state of deleted script ${scriptId}`, error));
        },
    };
};
