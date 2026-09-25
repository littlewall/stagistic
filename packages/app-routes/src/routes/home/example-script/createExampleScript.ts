import type {ScriptRepository} from '@stagistic/app-core';
import {linkCharacterRefInScriptDocument, type ScriptDocument} from '@stagistic/script';

import {EXAMPLE_CHARACTERS, EXAMPLE_COMMENT_THREADS, EXAMPLE_GROUPS, EXAMPLE_LOCATIONS} from './exampleScriptMetadata';
import {loadExampleScriptTemplate} from './loadExampleScriptTemplate';
import {anchorExampleComment} from './prepareExampleScriptDocument';

const INTEGRATED_SCORE_ROLE = 'integrated_score';

export interface ExampleScriptActions {
    createScript(title: string, document: ScriptDocument): Promise<string>;
    deleteScript(scriptId: string): Promise<void>;
}

export type ExampleScriptRepository = Pick<
    ScriptRepository,
    | 'allocateScriptCharacterId'
    | 'allocateScriptCharacterGroupId'
    | 'allocateScriptCommentThreadId'
    | 'allocateScriptCommentMessageId'
    | 'allocateScriptLocationId'
    | 'confirmScriptCharacterWithId'
    | 'createScriptCharacterGroupWithId'
    | 'replaceScriptCharacterGroupMembers'
    | 'upsertScriptCharacterGender'
    | 'setScriptCharacterGender'
    | 'setScriptCharacterOutline'
    | 'setScriptCharacterVoiceType'
    | 'setScriptCharacterVocalRange'
    | 'createScriptCommentThread'
    | 'addScriptCommentMessage'
    | 'setScriptCommentThreadStatus'
    | 'createScriptLocationWithId'
    | 'replaceScriptSceneLocations'
    | 'saveLatest'
    | 'saveTitlePage'
    | 'setMusicAttachment'
    | 'removeMusicAttachment'
>;

interface CreateExampleScriptArgs {
    actions: ExampleScriptActions;
    repository: ExampleScriptRepository;
}

interface CreatedExampleScript {
    scriptId: string;
    title: string;
}

const required = <T>(value: T | null | undefined, message: string): T => {
    if (value === null || value === undefined) {
        throw new Error(message);
    }

    return value;
};

const linkRef = (document: ScriptDocument, key: string, id: string) => {
    return linkCharacterRefInScriptDocument(document, key, id).value;
};

const createCharacters = async (repository: ExampleScriptRepository, scriptId: string, document: ScriptDocument) => {
    const characterIdsByKey = new Map<string, string>();
    const genderKeysByLabel = new Map<string, string>();
    let linkedDocument = document;

    for (const label of new Set(EXAMPLE_CHARACTERS.map(character => character.genderLabel))) {
        const gender = required(await repository.upsertScriptCharacterGender(scriptId, label), `Example gender could not be created: ${label}.`);

        genderKeysByLabel.set(label, gender.key);
    }

    for (const character of EXAMPLE_CHARACTERS) {
        const created = required(
            await repository.confirmScriptCharacterWithId(scriptId, {
                id: repository.allocateScriptCharacterId(),
                key: character.key,
                colorHex: character.colorHex,
            }),
            `Example character could not be created: ${character.key}.`,
        );

        await repository.setScriptCharacterGender(scriptId, created.id, genderKeysByLabel.get(character.genderLabel) ?? null);
        await repository.setScriptCharacterOutline(scriptId, created.id, character.outline);
        await repository.setScriptCharacterVoiceType(scriptId, created.id, character.voiceType);
        await repository.setScriptCharacterVocalRange(scriptId, created.id, character.vocalRange.low, character.vocalRange.high);
        characterIdsByKey.set(character.key, created.id);
        linkedDocument = linkRef(linkedDocument, character.key, created.id);
    }

    for (const group of EXAMPLE_GROUPS) {
        const created = required(
            await repository.createScriptCharacterGroupWithId(scriptId, {
                id: repository.allocateScriptCharacterGroupId(),
                key: group.key,
                colorHex: group.colorHex,
            }),
            `Example group could not be created: ${group.key}.`,
        );

        await repository.replaceScriptCharacterGroupMembers(
            scriptId,
            created.id,
            group.memberKeys.map(key => required(characterIdsByKey.get(key), `Unknown group member: ${key}.`)),
        );
        linkedDocument = linkRef(linkedDocument, group.key, created.id);
    }

    return linkedDocument;
};

const createComments = async (repository: ExampleScriptRepository, scriptId: string, document: ScriptDocument) => {
    const startedAt = Date.now();
    let anchoredDocument = document;
    let messageNumber = 0;

    for (const thread of EXAMPLE_COMMENT_THREADS) {
        const threadId = repository.allocateScriptCommentThreadId();
        const anchored = anchorExampleComment(anchoredDocument, {...thread, id: threadId});
        const [body = '', ...replies] = thread.messages;

        anchoredDocument = anchored.document;
        required(
            await repository.createScriptCommentThread(scriptId, {
                id: threadId,
                messageId: repository.allocateScriptCommentMessageId(),
                anchorKind: thread.quote ? 'range' : 'block',
                anchorBlockId: thread.quote ? null : anchored.blockId,
                quotedText: thread.quote ?? thread.blockText,
                body,
                timestamp: startedAt + messageNumber++,
            }),
            'Example comment could not be created.',
        );

        for (const reply of replies) {
            await repository.addScriptCommentMessage(scriptId, {
                id: repository.allocateScriptCommentMessageId(),
                threadId,
                body: reply,
                timestamp: startedAt + messageNumber++,
            });
        }

        if (thread.resolved) {
            await repository.setScriptCommentThreadStatus(scriptId, threadId, 'resolved');
        }
    }

    return anchoredDocument;
};

const createLocations = async (repository: ExampleScriptRepository, scriptId: string, sceneBlockIdsByTitle: ReadonlyMap<string, string>) => {
    const locationIdsBySceneId = new Map<string, string[]>();

    for (const location of EXAMPLE_LOCATIONS) {
        const created = required(
            await repository.createScriptLocationWithId(scriptId, {
                id: repository.allocateScriptLocationId(),
                name: location.name,
            }),
            `Example location could not be created: ${location.name}.`,
        );

        location.sceneTitles.forEach(title => {
            const sceneId = required(sceneBlockIdsByTitle.get(title), `Unknown example scene: ${title}.`);

            locationIdsBySceneId.set(sceneId, [...(locationIdsBySceneId.get(sceneId) ?? []), created.id]);
        });
    }

    for (const [sceneId, locationIds] of locationIdsBySceneId) {
        await repository.replaceScriptSceneLocations(scriptId, sceneId, locationIds);
    }
};

export const createExampleScript = async ({actions, repository}: CreateExampleScriptArgs): Promise<CreatedExampleScript> => {
    const template = await loadExampleScriptTemplate();
    const scriptId = await actions.createScript(template.title, template.document);
    let scoreAttached = false;

    try {
        const linkedDocument = await createCharacters(repository, scriptId, template.document);
        const commentedDocument = await createComments(repository, scriptId, linkedDocument);

        await repository.saveLatest(scriptId, commentedDocument);
        await createLocations(repository, scriptId, template.sceneBlockIdsByTitle);
        await repository.setMusicAttachment(scriptId, template.scoreMusicId, INTEGRATED_SCORE_ROLE, template.score);
        scoreAttached = true;
        // Title page saves last: its write flushes the local database to disk.
        await repository.saveTitlePage(scriptId, template.titlePage);

        return {scriptId, title: template.title};
    } catch (error) {
        if (scoreAttached) {
            await repository.removeMusicAttachment(scriptId, template.scoreMusicId, INTEGRATED_SCORE_ROLE).catch(() => undefined);
        }

        await actions.deleteScript(scriptId).catch(() => undefined);
        throw error;
    }
};
