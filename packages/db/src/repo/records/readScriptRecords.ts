import {requireValue} from '@stagistic/shared';
import {
    RECORD_COLLECTIONS,
    type RecordFields,
    type RecordsKind,
    type RecordsSnapshot,
    SCRIPT_RECORD_ID,
} from '@stagistic/sync-engine';
import {
    and,
    eq,
    inArray,
    isNotNull,
} from 'drizzle-orm';

import type {DbClient} from '../../queries';
import {
    scriptAttachments,
    scriptCharacterGenders,
    scriptCharacterGroupMembers,
    scriptCharacters,
    scriptCommentMessages,
    scriptCommentThreads,
    scriptLocations,
    scriptMusic,
    scriptMusicAttachments,
    scripts,
    scriptSceneLocations,
    scriptScenes,
} from '../../schema';
import {readScriptSettings} from '../config/config';
import {readTitlePageSettings} from '../config/titlePage';

/*
 * Projection rows -> records (see `@stagistic/sync-engine` scriptRecords).
 * Only user-authored fields: body-derived columns (scene numbers, music
 * placement) and `updatedAt` stay out of the Y.Doc.
 */

const byId = <T extends {id: string}>(rows: T[], toFields: (row: T) => RecordFields) => Object.fromEntries(rows.map(row => [row.id, toFields(row)]));

const sortedIds = (ids: string[]) => [...ids].toSorted();

export const musicAttachmentRecordId = (musicId: string, role: string) => `${musicId}:${role}`;

type CollectionReader = (db: DbClient, scriptId: string) => Promise<Record<string, RecordFields>>;

const singleton = (fields: RecordFields | null): Record<string, RecordFields> => (fields ? {[SCRIPT_RECORD_ID]: fields} : {});

const readCharacters: CollectionReader = async (db, scriptId) => {
    const characters = await db.select().from(scriptCharacters).where(eq(scriptCharacters.scriptId, scriptId));
    const groupIds = characters.filter(row => row.kind === 'group').map(row => row.id);
    const members = groupIds.length > 0
        ? await db.select().from(scriptCharacterGroupMembers).where(inArray(scriptCharacterGroupMembers.groupId, groupIds))
        : [];

    return byId(characters, row => ({
        key: row.characterKey,
        kind: row.kind,
        colorHex: row.colorHex,
        genderKey: row.genderKey,
        notes: row.notes,
        backstory: row.backstory,
        outline: row.outline,
        voiceType: row.voiceType,
        vocalRangeLow: row.vocalRangeLow,
        vocalRangeHigh: row.vocalRangeHigh,
        createdAt: row.createdAt,
        ...row.kind === 'group'
            ? {memberIds: sortedIds(members.filter(member => member.groupId === row.id).map(member => member.characterId))}
            : {},
    }));
};

const readScenes: CollectionReader = async (db, scriptId) => {
    const scenes = await db
        .select()
        .from(scriptScenes)
        .where(and(eq(scriptScenes.scriptId, scriptId), isNotNull(scriptScenes.headingBlockId)));
    const sceneLocations = scenes.length > 0
        ? await db.select().from(scriptSceneLocations).where(inArray(scriptSceneLocations.sceneId, scenes.map(row => row.id)))
        : [];
    const records: Record<string, RecordFields> = {};

    for (const scene of scenes) {
        const locationIds = sortedIds(sceneLocations.filter(row => row.sceneId === scene.id).map(row => row.locationId));

        // Scenes are body-derived; only their user metadata is a record.
        if (scene.colorHex !== null || scene.synopsis !== null || scene.locationId !== null || locationIds.length > 0) {
            records[requireValue(scene.headingBlockId)] = {
                colorHex: scene.colorHex,
                synopsis: scene.synopsis,
                locationId: scene.locationId,
                locationIds,
            };
        }
    }

    return records;
};

const readMusicAttachments: CollectionReader = async (db, scriptId) => {
    const music = await db.select({id: scriptMusic.id}).from(scriptMusic).where(eq(scriptMusic.scriptId, scriptId));
    const rows = music.length > 0
        ? await db.select().from(scriptMusicAttachments).where(inArray(scriptMusicAttachments.musicId, music.map(row => row.id)))
        : [];

    return Object.fromEntries(rows.map(row => [
        musicAttachmentRecordId(row.musicId, row.role),
        {
            musicId: row.musicId,
            attachmentId: row.attachmentId,
            role: row.role,
            sortOrder: row.sortOrder,
            createdAt: row.createdAt,
        },
    ]));
};

const READERS: Record<string, CollectionReader> = {
    script: async (db, scriptId) => {
        const [script] = await db.select({title: scripts.title, subtitle: scripts.subtitle}).from(scripts).where(eq(scripts.id, scriptId));

        return singleton(script ? {title: script.title, subtitle: script.subtitle} : null);
    },
    characters: readCharacters,
    genders: async (db, scriptId) => byId(
        await db.select().from(scriptCharacterGenders).where(eq(scriptCharacterGenders.scriptId, scriptId)),
        row => ({
            key: row.genderKey,
            label: row.genderLabel,
            createdAt: row.createdAt,
        }),
    ),
    locations: async (db, scriptId) => byId(
        await db.select().from(scriptLocations).where(eq(scriptLocations.scriptId, scriptId)),
        row => ({
            name: row.name,
            description: row.description,
            createdAt: row.createdAt,
        }),
    ),
    scenes: readScenes,
    music: async (db, scriptId) => byId(
        await db.select().from(scriptMusic).where(eq(scriptMusic.scriptId, scriptId)),
        row => ({
            title: row.title,
            kind: row.kind,
            createdAt: row.createdAt,
        }),
    ),
    attachments: async (db, scriptId) => byId(
        await db.select().from(scriptAttachments).where(eq(scriptAttachments.scriptId, scriptId)),
        row => ({
            filename: row.filename,
            mimeType: row.mimeType,
            sizeBytes: row.sizeBytes,
            storageKey: row.storageKey,
            sha256: row.sha256,
            createdAt: row.createdAt,
        }),
    ),
    musicAttachments: readMusicAttachments,
    settings: async (db, scriptId) => {
        const settings = await readScriptSettings(db, scriptId);

        return singleton(settings ? {...settings} : null);
    },
    titlePage: async (db, scriptId) => {
        const titlePage = await readTitlePageSettings(db, scriptId);

        return singleton(titlePage ? {...titlePage} : null);
    },
    threads: async (db, scriptId) => byId(
        await db.select().from(scriptCommentThreads).where(eq(scriptCommentThreads.scriptId, scriptId)),
        row => ({
            anchorKind: row.anchorKind,
            anchorBlockId: row.anchorBlockId,
            quotedText: row.quotedText,
            status: row.status,
            resolvedAt: row.resolvedAt,
            resolvedBy: row.resolvedBy,
            createdBy: row.createdBy,
            createdAt: row.createdAt,
        }),
    ),
    messages: async (db, scriptId) => byId(
        await db.select().from(scriptCommentMessages).where(eq(scriptCommentMessages.scriptId, scriptId)),
        row => ({
            threadId: row.threadId,
            authorId: row.authorId,
            body: row.body,
            createdAt: row.createdAt,
            editedAt: row.editedAt,
        }),
    ),
};

/** Records of one kind as currently projected (`collections` defaults to all of the kind). */
export const readScriptRecords = async (
    db: DbClient,
    scriptId: string,
    kind: RecordsKind,
    collections: readonly string[] = RECORD_COLLECTIONS[kind],
): Promise<RecordsSnapshot> => {
    const snapshot: RecordsSnapshot = {};

    for (const collection of collections) {
        snapshot[collection] = await READERS[collection](db, scriptId);
    }

    return snapshot;
};
