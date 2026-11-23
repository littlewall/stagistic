import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import type {StepkgSnapshot} from '@stagistic/stepkg';
import * as fc from 'fast-check';

import {arbitraryScriptDocument, arbitraryScriptTitle} from './scriptDocumentArbitrary';
import {arbitraryTitlePage} from './titlePageArbitrary';

/*
 * Valid StepkgSnapshot generator (types only from @stagistic/stepkg). Shape rules, written
 * from the package contract, not from its validator:
 * - every entity id is unique and non-empty; references (group members, scene locations,
 *   scene characters, music blocks, attachment bindings, comment threads) point at existing rows;
 * - scenes, music start/end and scene-character rows reference real top-level block ids;
 * - the document's `characterRefs`, `musicId` and `commentAnchor` ids point at snapshot rows;
 * - attachment ids use the safe id alphabet and `contentKey` is the storage key (any string).
 */

const arbitraryIso = fc
    .integer({min: Date.UTC(2020, 0, 1), max: Date.UTC(2030, 0, 1)})
    .map(millis => new Date(millis).toISOString());

const arbitraryNullableText = fc.option(fc.string({unit: 'grapheme', maxLength: 20}), {nil: null});
const arbitraryColor = fc.option(fc.constantFrom('#112233', '#aabbcc', '#ff00ff'), {nil: null});

const ids = (prefix: string, count: number): string[] => Array.from({length: count}, (_, index) => `${prefix}-${index + 1}`);

const arbitraryPick = <T>(values: readonly T[]): fc.Arbitrary<T | null> => (values.length === 0
    ? fc.constant(null)
    : fc.oneof({arbitrary: fc.constantFrom(...values), weight: 4}, {arbitrary: fc.constant(null), weight: 1}));

const arbitrarySubset = <T>(values: readonly T[]): fc.Arbitrary<T[]> => (values.length === 0
    ? fc.constant([])
    : fc.subarray([...values]));

const topLevelIds = (document: ScriptDocument, type?: string): string[] => document.content
    .filter(node => type === undefined || node.type === type)
    .map(node => String(node.attrs?.id));

const musicIdsOf = (document: ScriptDocument): string[] => {
    const found: string[] = [];
    const visit = (node: ScriptNode): void => {
        if (node.type === 'musicStart' && typeof node.attrs?.musicId === 'string') {
            found.push(node.attrs.musicId);
        }

        node.content?.forEach(visit);
    };

    document.content.forEach(visit);

    return found;
};

/* Points the document's placeholder references at snapshot rows and adds comment anchors. */
const bindDocument = (document: ScriptDocument, characterIds: string[], threadIds: string[]): ScriptDocument => {
    let characterCounter = 0;
    let threadCounter = 0;
    const visit = (node: ScriptNode): ScriptNode => {
        let next = node;
        const refs = node.attrs?.characterRefs as Record<string, string> | undefined;

        if (refs && characterIds.length === 0) {
            const {characterRefs: _dropped, ...attrs} = next.attrs ?? {};

            next = {...next, attrs};
        } else if (refs) {
            next = {
                ...next,
                attrs: {
                    ...next.attrs,
                    characterRefs: Object.fromEntries(Object.keys(refs).map(key => [key, characterIds[characterCounter++ % characterIds.length]])),
                },
            };
        }

        if (next.type === 'text' && threadIds.length > 0 && (threadCounter += 1) % 3 === 0) {
            next = {
                ...next,
                marks: [
                    ...next.marks ?? [],
                    {type: 'commentAnchor', attrs: {threadId: threadIds[threadCounter % threadIds.length]}},
                ],
            };
        }

        return next.content ? {...next, content: next.content.map(visit)} : next;
    };

    return {...document, content: document.content.map(visit)};
};

interface Skeleton {
    document: ScriptDocument,
    characterCount: number,
    groupCount: number,
    genderCount: number,
    locationCount: number,
    threadCount: number,
    messageCount: number,
    attachmentCount: number,
    extraMusicCount: number,
}

const arbitrarySkeleton: fc.Arbitrary<Skeleton> = fc.record({
    document: arbitraryScriptDocument,
    characterCount: fc.nat({max: 3}),
    groupCount: fc.nat({max: 2}),
    genderCount: fc.nat({max: 2}),
    locationCount: fc.nat({max: 2}),
    threadCount: fc.nat({max: 3}),
    messageCount: fc.nat({max: 4}),
    attachmentCount: fc.nat({max: 2}),
    extraMusicCount: fc.nat({max: 2}),
});

export const arbitraryStepkgSnapshot: fc.Arbitrary<StepkgSnapshot> = arbitrarySkeleton.chain(skeleton => {
    const characterIds = ids('character', skeleton.characterCount);
    const groupIds = ids('group', skeleton.groupCount);
    const genderIds = ids('gender', skeleton.genderCount);
    const locationIds = ids('location', skeleton.locationCount);
    const threadIds = ids('thread', skeleton.threadCount);
    const document = bindDocument(skeleton.document, characterIds, threadIds);
    const blockIds = topLevelIds(document);
    const headingIds = topLevelIds(document, 'scene');
    const musicIds = [...musicIdsOf(document), ...ids('music-extra', skeleton.extraMusicCount)];
    const genderKeys = genderIds.map(id => `key-${id}`);
    const attachmentIds = ids('attachment', skeleton.attachmentCount);

    const characters = fc.tuple(...characterIds.map(id => fc.record({
        id: fc.constant(id),
        key: fc.constant(`KEY-${id}`),
        colorHex: arbitraryColor,
        genderKey: arbitraryPick(genderKeys),
        notes: arbitraryNullableText,
        backstory: arbitraryNullableText,
        outline: arbitraryNullableText,
        voiceType: arbitraryNullableText,
        vocalRangeLow: arbitraryNullableText,
        vocalRangeHigh: arbitraryNullableText,
        createdAt: arbitraryIso,
        updatedAt: arbitraryIso,
    })));
    const groups = fc.tuple(...groupIds.map(id => fc.record({
        id: fc.constant(id),
        key: fc.constant(`GROUP-${id}`),
        colorHex: arbitraryColor,
        memberIds: arbitrarySubset(characterIds),
        createdAt: arbitraryIso,
        updatedAt: arbitraryIso,
    })));
    const genderOptions = fc.tuple(...genderIds.map((id, index) => fc.record({
        id: fc.constant(id),
        key: fc.constant(genderKeys[index]),
        label: fc.string({unit: 'grapheme', maxLength: 12}),
        createdAt: arbitraryIso,
        updatedAt: arbitraryIso,
    })));
    const music = fc.tuple(...musicIds.map((id, index) => fc.record({
        id: fc.constant(id),
        sceneNumber: fc.nat({max: 20}),
        indexInScene: fc.constant(index),
        mode: fc.constantFrom('background', 'foreground'),
        title: fc.string({unit: 'grapheme', maxLength: 12}),
        kind: fc.option(fc.constantFrom('song', 'underscore'), {nil: null}),
        startBlockId: arbitraryPick(blockIds),
        endBlockId: arbitraryPick(blockIds),
        createdAt: arbitraryIso,
        updatedAt: arbitraryIso,
    })));
    const locations = fc.tuple(...locationIds.map(id => fc.record({
        id: fc.constant(id),
        name: fc.string({unit: 'grapheme', maxLength: 12}),
        description: arbitraryNullableText,
        createdAt: arbitraryIso,
        updatedAt: arbitraryIso,
    })));
    const scenes = fc.tuple(...headingIds.map((headingId, index) => fc.record({
        id: fc.constant(`scene-${index + 1}`),
        headingBlockId: fc.oneof({arbitrary: fc.constant<string | null>(headingId), weight: 5}, {arbitrary: fc.constant(null), weight: 1}),
        sceneNumber: fc.option(fc.constantFrom('1', '2A', '3'), {nil: null}),
        colorHex: arbitraryColor,
        synopsis: arbitraryNullableText,
        locationIds: arbitrarySubset(locationIds),
        createdAt: arbitraryIso,
        updatedAt: arbitraryIso,
    })));
    const sceneCharacterPairs = headingIds.flatMap(headingId => characterIds.map(characterId => ({headingId, characterId})));
    const sceneCharacters = arbitrarySubset(sceneCharacterPairs).chain(pairs => fc.tuple(...pairs.map(({headingId, characterId}) => fc.record({
        headingBlockId: fc.constant(headingId),
        characterId: fc.constant(characterId),
        note: arbitraryNullableText,
        arcValue: fc.option(fc.integer({min: -100, max: 100}), {nil: null}),
        onCard: fc.boolean(),
        createdAt: arbitraryIso,
        updatedAt: arbitraryIso,
    }))));
    const attachments = fc.tuple(...attachmentIds.map(id => fc.record({
        id: fc.constant(id),
        filename: fc.constantFrom('a.png', 'score.pdf', 'x y.txt'),
        mimeType: fc.constantFrom('image/png', 'application/pdf', 'text/plain'),
        sizeBytes: fc.nat({max: 16}),
        createdAt: arbitraryIso,
        updatedAt: arbitraryIso,
        contentKey: fc.constant(`storage/${id}`),
    })));
    const bindings = musicIds.length === 0 || attachmentIds.length === 0
        ? fc.constant([])
        : fc.array(fc.record({
            target: fc.record({type: fc.constant('music' as const), id: fc.constantFrom(...musicIds)}),
            attachmentId: fc.constantFrom(...attachmentIds),
            role: fc.constantFrom('score', 'reference'),
            order: fc.nat({max: 5}),
            createdAt: arbitraryIso,
        }), {maxLength: 3});
    const threads = fc.tuple(...threadIds.map(id => fc.record({
        id: fc.constant(id),
        anchorKind: fc.constantFrom('range' as const, 'block' as const),
        anchorBlockId: arbitraryPick(blockIds),
        quotedText: fc.string({unit: 'grapheme', maxLength: 12}),
        status: fc.constantFrom('open' as const, 'resolved' as const),
        resolvedAt: fc.constant(null),
        resolvedBy: fc.constant(null),
        createdBy: fc.constant('local'),
        createdAt: arbitraryIso,
        updatedAt: arbitraryIso,
    })));
    const messages = threadIds.length === 0
        ? fc.constant([])
        : fc.tuple(...ids('message', skeleton.messageCount).map(id => fc.record({
            id: fc.constant(id),
            threadId: fc.constantFrom(...threadIds),
            authorId: fc.constant('local'),
            body: fc.string({unit: 'grapheme', maxLength: 20}),
            createdAt: arbitraryIso,
            updatedAt: arbitraryIso,
            editedAt: fc.constant(null),
        })));

    return fc.record({
        script: fc.record({
            id: fc.constant('script-1'),
            title: arbitraryScriptTitle,
            subtitle: arbitraryNullableText,
            createdAt: arbitraryIso,
            updatedAt: arbitraryIso,
        }),
        document: fc.constant(document),
        titlePage: arbitraryTitlePage,
        settings: fc.constant({}),
        characters: fc.record({
            characters,
            groups,
            genderOptions,
        }),
        music: fc.record({items: music}),
        scenes: fc.record({scenes, locations}),
        sceneCharacters: fc.record({items: sceneCharacters}),
        attachments,
        attachmentBindings: bindings,
        comments: fc.record({threads, messages}),
    }) as fc.Arbitrary<StepkgSnapshot>;
});
