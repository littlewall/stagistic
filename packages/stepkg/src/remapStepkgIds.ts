import {COMMENT_ANCHOR_MARK_NAME, COMMENT_THREAD_ID_ATTR, MUSIC_ID_ATTR, type ScriptDocument} from '@stagistic/script';
import {uuidv7} from '@stagistic/shared';

import type {StepkgSnapshot} from './contracts';

export interface StepkgIdMap {
    characters: Record<string, string>;
    groups: Record<string, string>;
    genders: Record<string, string>;
    music: Record<string, string>;
    locations: Record<string, string>;
    attachments: Record<string, string>;
    commentThreads: Record<string, string>;
    commentMessages: Record<string, string>;
}

export interface StepkgRemapResult {
    snapshot: StepkgSnapshot;
    idMap: StepkgIdMap;
}

const CHARACTER_REFS_ATTR = 'characterRefs';

const buildMap = (ids: string[], newId: () => string): Record<string, string> => Object.fromEntries(ids.map(id => [id, newId()]));

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

interface DocumentIdMaps {
    characters: Record<string, string>;
    music: Record<string, string>;
    commentThreads: Record<string, string>;
}

const remapDocument = (node: unknown, maps: DocumentIdMaps): unknown => {
    if (Array.isArray(node)) return node.map(child => remapDocument(child, maps));
    if (!isRecord(node)) return node;

    const next: Record<string, unknown> = {...node};
    if (isRecord(next.attrs)) {
        const attrs: Record<string, unknown> = {...next.attrs};
        const characterRefs = attrs[CHARACTER_REFS_ATTR];
        if (isRecord(characterRefs)) {
            attrs[CHARACTER_REFS_ATTR] = Object.fromEntries(
                Object.entries(characterRefs).map(([key, value]) => [key, typeof value === 'string' ? (maps.characters[value] ?? value) : value]),
            );
        }
        const musicId = attrs[MUSIC_ID_ATTR];
        if (typeof musicId === 'string') {
            attrs[MUSIC_ID_ATTR] = maps.music[musicId] ?? musicId;
        }
        const threadId = attrs[COMMENT_THREAD_ID_ATTR];
        if (next.type === COMMENT_ANCHOR_MARK_NAME && typeof threadId === 'string') {
            attrs[COMMENT_THREAD_ID_ATTR] = maps.commentThreads[threadId] ?? threadId;
        }
        next.attrs = attrs;
    }
    if (Array.isArray(next.content)) next.content = next.content.map(child => remapDocument(child, maps));
    if (Array.isArray(next.marks)) next.marks = next.marks.map(child => remapDocument(child, maps));
    return next;
};

export const remapStepkgIds = (snapshot: StepkgSnapshot, newId: () => string = uuidv7): StepkgRemapResult => {
    const idMap: StepkgIdMap = {
        characters: buildMap(
            snapshot.characters.characters.map(character => character.id),
            newId,
        ),
        groups: buildMap(
            snapshot.characters.groups.map(group => group.id),
            newId,
        ),
        genders: buildMap(
            snapshot.characters.genderOptions.map(gender => gender.id),
            newId,
        ),
        music: buildMap(
            snapshot.music.items.map(item => item.id),
            newId,
        ),
        locations: buildMap(
            snapshot.scenes.locations.map(location => location.id),
            newId,
        ),
        attachments: buildMap(
            snapshot.attachments.map(attachment => attachment.id),
            newId,
        ),
        commentThreads: buildMap(
            snapshot.comments.threads.map(thread => thread.id),
            newId,
        ),
        commentMessages: buildMap(
            snapshot.comments.messages.map(message => message.id),
            newId,
        ),
    };

    const next: StepkgSnapshot = {
        script: {...snapshot.script, id: newId()},
        document: remapDocument(snapshot.document, {characters: idMap.characters, music: idMap.music, commentThreads: idMap.commentThreads}) as ScriptDocument,
        titlePage: snapshot.titlePage,
        settings: snapshot.settings,
        characters: {
            characters: snapshot.characters.characters.map(character => ({...character, id: idMap.characters[character.id]})),
            groups: snapshot.characters.groups.map(group => ({
                ...group,
                id: idMap.groups[group.id],
                memberIds: group.memberIds.map(memberId => idMap.characters[memberId] ?? memberId),
            })),
            genderOptions: snapshot.characters.genderOptions.map(gender => ({...gender, id: idMap.genders[gender.id]})),
        },
        music: {items: snapshot.music.items.map(item => ({...item, id: idMap.music[item.id]}))},
        scenes: {
            scenes: snapshot.scenes.scenes.map(scene => ({
                ...scene,
                locationIds: scene.locationIds.map(locationId => idMap.locations[locationId] ?? locationId),
            })),
            locations: snapshot.scenes.locations.map(location => ({...location, id: idMap.locations[location.id]})),
        },
        attachments: snapshot.attachments.map(attachment => ({...attachment, id: idMap.attachments[attachment.id]})),
        attachmentBindings: snapshot.attachmentBindings.map(binding => ({
            ...binding,
            attachmentId: idMap.attachments[binding.attachmentId] ?? binding.attachmentId,
            target: {...binding.target, id: idMap.music[binding.target.id] ?? binding.target.id},
        })),
        comments: {
            threads: snapshot.comments.threads.map(thread => ({...thread, id: idMap.commentThreads[thread.id]})),
            messages: snapshot.comments.messages.map(message => ({
                ...message,
                id: idMap.commentMessages[message.id],
                threadId: idMap.commentThreads[message.threadId] ?? message.threadId,
            })),
        },
    };

    return {snapshot: next, idMap};
};
