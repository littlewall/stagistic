import {SCRIPT_DOCUMENT_SCHEMA_VERSION} from '@stagistic/script';
import {
    arbitraryCorruptedBytes,
    arbitraryHostileBytes,
    arbitraryStepkgSnapshot,
    oracleParameters,
} from '@stagistic/test-oracles';
import * as fc from 'fast-check';
import {
    deflateSync,
    unzipSync,
    zipSync,
} from 'fflate';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import type {StepkgManifest, StepkgSnapshot} from './contracts';
import {createStepkg} from './createStepkg';
import {readStepkg} from './readStepkg';
import {remapStepkgBlockIds} from './remapStepkgBlockIds';
import {remapStepkgIds} from './remapStepkgIds';
import {decodeStepkgSnapshotPayload, encodeStepkgSnapshotPayload} from './snapshotPayload';

/*
 * Oracles for .stepkg packages and snapshot payloads (docs/testing-oracles.md).
 * Rules are written from the package contract; only types and constants are shared with the code under test.
 *
 * - Round trip: readStepkg(createStepkg(s)) and decode(encode(s)) restore s. Normalization:
 *   values pass through JSON (`undefined` fields vanish); a package attachment's `contentKey`
 *   becomes its asset path `assets/<id>/<file>`; the payload keeps `contentKey` as is.
 * - Hostile input: damaged bytes or structurally wrong JSON give `ok: false` with issues, never a throw.
 * - Remap: fresh unique ids, every reference follows its target, all other data is untouched.
 */

const parameters = oracleParameters('pure');
const GENERATOR = {name: 'Stagistic', version: '0.0.0'};
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');

const viaJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const exportBytes = async (snapshot: StepkgSnapshot): Promise<Uint8Array> => {
    const result = await createStepkg({
        snapshot,
        generator: GENERATOR,
        createdAt: CREATED_AT,
        loadAsset: key => {
            const attachment = snapshot.attachments.find(item => item.contentKey === key);

            return Promise.resolve(attachment ? new Blob([new Uint8Array(attachment.sizeBytes).fill(7)]) : null);
        },
    });

    if (!result.ok) {
        throw new Error(`export failed: ${JSON.stringify(result.issues)}`);
    }

    return new Uint8Array(await result.blob.arrayBuffer());
};

const withoutContentKeys = (snapshot: StepkgSnapshot) => ({
    ...snapshot,
    attachments: snapshot.attachments.map(({contentKey: _contentKey, ...rest}) => rest),
});

describe('stepkg package round trip', () => {
    it('readStepkg(createStepkg(snapshot)) restores the snapshot', async () => {
        await fc.assert(
            fc.asyncProperty(arbitraryStepkgSnapshot, async snapshot => {
                const read = await readStepkg(await exportBytes(snapshot));

                expect(read.ok).toBe(true);

                if (!read.ok) {
                    return;
                }

                expect(read.issues).toEqual([]);
                expect(withoutContentKeys(read.package.snapshot)).toEqual(withoutContentKeys(viaJson(snapshot)));
                read.package.snapshot.attachments.forEach((attachment, index) => {
                    const expected = snapshot.attachments[index];

                    expect(attachment.contentKey.startsWith(`assets/${expected.id}/`)).toBe(true);
                    expect(read.package.assets.get(attachment.contentKey)?.byteLength).toBe(expected.sizeBytes);
                });
                expect(read.package.manifest.script.id).toBe(snapshot.script.id);
            }),
            {...parameters, numRuns: Math.min(parameters.numRuns ?? 100, 60)},
        );
    });
});

describe('stepkg snapshot payload round trip', () => {
    it('decode(encode(snapshot)) returns an equal snapshot', () => {
        fc.assert(
            fc.property(arbitraryStepkgSnapshot, snapshot => {
                const decoded = decodeStepkgSnapshotPayload(encodeStepkgSnapshotPayload(snapshot));

                expect(decoded.ok).toBe(true);

                if (decoded.ok) {
                    expect(decoded.snapshot).toEqual(viaJson(snapshot));
                    expect(decoded.documentSchemaVersion).toBe(SCRIPT_DOCUMENT_SCHEMA_VERSION);
                }
            }),
            parameters,
        );
    });
});

const expectControlled = (result: {ok: boolean, issues?: unknown[]}) => {
    if (!result.ok) {
        expect(result.issues?.length).toBeGreaterThan(0);
    }
};

const sha256 = async (bytes: Uint8Array) => {
    const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new Uint8Array(bytes)));

    return [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
};
const encoder = new TextEncoder();

/* Replaces one file of a valid package with arbitrary JSON and keeps the manifest checksums consistent. */
const tamper = async (valid: Uint8Array, path: string, value: unknown): Promise<Uint8Array> => {
    const files = unzipSync(valid);
    const bytes = encoder.encode(JSON.stringify(value) ?? 'undefined');

    if (path === 'manifest.json') {
        files[path] = bytes;

        return zipSync(files);
    }

    files[path] = bytes;

    const manifest = JSON.parse(new TextDecoder().decode(files['manifest.json'])) as StepkgManifest;

    const digest = await sha256(bytes);

    manifest.files = manifest.files.map(file => (file.path === path ? {
        ...file,
        byteLength: bytes.byteLength,
        sha256: digest,
    } : file));
    files['manifest.json'] = encoder.encode(JSON.stringify(manifest));

    return zipSync(files);
};

/* Counterexamples (fixed): a file with consistent checksums but the wrong JSON shape used to throw a TypeError. */
const TAMPER_COUNTEREXAMPLES: [string, unknown][] = [
    ['data/characters.json', []],
    ['manifest.json', null],
];

const TAMPER_PATHS = [
    'manifest.json',
    'document.json',
    'data/script.json',
    'data/title-page.json',
    'data/settings.json',
    'data/characters.json',
    'data/music.json',
    'data/scenes.json',
    'data/attachments.json',
    'data/comments.json',
    'data/scene-characters.json',
] as const;

describe('stepkg hostile input', () => {
    it('readStepkg never throws on corrupted or arbitrary bytes', async () => {
        const valid = await fc.sample(arbitraryStepkgSnapshot, {seed: parameters.seed, numRuns: 1}).map(exportBytes)[0];

        await fc.assert(
            fc.asyncProperty(fc.oneof(arbitraryCorruptedBytes(valid), arbitraryHostileBytes), async bytes => {
                expectControlled(await readStepkg(bytes));
            }),
            parameters,
        );
    });

    it('readStepkg never throws when a file holds arbitrary JSON with consistent checksums', async () => {
        const valid = await fc.sample(arbitraryStepkgSnapshot, {seed: parameters.seed, numRuns: 1}).map(exportBytes)[0];

        await fc.assert(
            fc.asyncProperty(fc.constantFrom(...TAMPER_PATHS), fc.jsonValue(), async (path, value) => {
                expectControlled(await readStepkg(await tamper(valid, path, value)));
            }),
            parameters,
        );
    });

    it.each(TAMPER_COUNTEREXAMPLES)('readStepkg returns issues when %s holds %j', async (path, value) => {
        const [snapshot] = fc.sample(arbitraryStepkgSnapshot, {seed: parameters.seed, numRuns: 1});
        const result = await readStepkg(await tamper(await exportBytes(snapshot), path, value));

        expect(result.ok).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
    });

    it('decodeStepkgSnapshotPayload never throws on corrupted or arbitrary bytes', () => {
        const [snapshot] = fc.sample(arbitraryStepkgSnapshot, {seed: parameters.seed, numRuns: 1});

        fc.assert(
            fc.property(fc.oneof(arbitraryCorruptedBytes(encodeStepkgSnapshotPayload(snapshot)), arbitraryHostileBytes), bytes => {
                expectControlled(decodeStepkgSnapshotPayload(bytes));
            }),
            parameters,
        );
    });

    it('decodeStepkgSnapshotPayload never throws on arbitrary JSON envelopes', () => {
        fc.assert(
            fc.property(fc.jsonValue(), value => {
                expectControlled(decodeStepkgSnapshotPayload(deflateSync(encoder.encode(JSON.stringify(value)))));
            }),
            parameters,
        );
    });
});

const makeNewId = () => {
    let counter = 0;

    return () => `fresh-${counter += 1}`;
};

/* Collects `[characterRefs values, musicIds, commentAnchor threadIds]` of a document in order, blanking them in a copy. */
const extractDocumentRefs = (document: unknown) => {
    const refs = {
        characters: [] as string[],
        music: [] as string[],
        threads: [] as string[],
    };
    const visit = (node: unknown): unknown => {
        if (Array.isArray(node)) {
            return node.map(visit);
        }

        if (node === null || typeof node !== 'object') {
            return node;
        }

        const copy = {...node} as Record<string, unknown>;
        const attrs = copy.attrs as Record<string, unknown> | undefined;

        if (attrs) {
            const next = {...attrs};

            if (next.characterRefs && typeof next.characterRefs === 'object') {
                next.characterRefs = Object.fromEntries(Object.entries(next.characterRefs).map(([key, value]) => {
                    refs.characters.push(String(value));

                    return [key, ''];
                }));
            }

            if (typeof next.musicId === 'string') {
                refs.music.push(next.musicId);
                next.musicId = '';
            }

            if (copy.type === 'commentAnchor' && typeof next.threadId === 'string') {
                refs.threads.push(next.threadId);
                next.threadId = '';
            }

            copy.attrs = next;
        }

        for (const key of ['content', 'marks']) {
            if (Array.isArray(copy[key])) {
                copy[key] = copy[key].map(visit);
            }
        }

        return copy;
    };

    return {refs, stripped: visit(document)};
};

const lookup = (map: Map<string, string>, id: string) => map.get(id) ?? `<unmapped ${id}>`;

describe('remapStepkgIds', () => {
    it('gives every row a fresh unique id and every reference follows its target', () => {
        fc.assert(
            fc.property(arbitraryStepkgSnapshot, snapshot => {
                const {snapshot: next} = remapStepkgIds(snapshot, makeNewId());
                const kinds = {
                    characters: [snapshot.characters.characters, next.characters.characters],
                    groups: [snapshot.characters.groups, next.characters.groups],
                    genders: [snapshot.characters.genderOptions, next.characters.genderOptions],
                    music: [snapshot.music.items, next.music.items],
                    locations: [snapshot.scenes.locations, next.scenes.locations],
                    attachments: [snapshot.attachments, next.attachments],
                    threads: [snapshot.comments.threads, next.comments.threads],
                    messages: [snapshot.comments.messages, next.comments.messages],
                } as const;
                const maps = Object.fromEntries(Object.entries(kinds).map(([kind, [before, after]]) => {
                    expect(after).toHaveLength(before.length);

                    return [kind, new Map(before.map((row, index) => [row.id, after[index].id]))];
                })) as Record<keyof typeof kinds, Map<string, string>>;
                const allNew = [
                    next.script.id,
                    ...Object.values(kinds).flatMap(([, after]) => after.map(row => row.id)),
                ];
                const oldIds = new Set([snapshot.script.id, ...Object.values(kinds).flatMap(([before]) => before.map(row => row.id))]);

                expect(new Set(allNew).size).toBe(allNew.length);
                allNew.forEach(id => expect(oldIds.has(id)).toBe(false));

                next.characters.groups.forEach((group, index) => {
                    expect(group.memberIds).toEqual(snapshot.characters.groups[index].memberIds.map(id => lookup(maps.characters, id)));
                });
                next.scenes.scenes.forEach((scene, index) => {
                    expect(scene.locationIds).toEqual(snapshot.scenes.scenes[index].locationIds.map(id => lookup(maps.locations, id)));
                    expect(scene.headingBlockId).toBe(snapshot.scenes.scenes[index].headingBlockId);
                });
                next.sceneCharacters.items.forEach((row, index) => {
                    expect(row.characterId).toBe(lookup(maps.characters, snapshot.sceneCharacters.items[index].characterId));
                    expect(row.headingBlockId).toBe(snapshot.sceneCharacters.items[index].headingBlockId);
                });
                next.attachmentBindings.forEach((binding, index) => {
                    const before = snapshot.attachmentBindings[index];

                    expect(binding.attachmentId).toBe(lookup(maps.attachments, before.attachmentId));
                    expect(binding.target.id).toBe(lookup(maps.music, before.target.id));
                });
                next.comments.messages.forEach((message, index) => {
                    expect(message.threadId).toBe(lookup(maps.threads, snapshot.comments.messages[index].threadId));
                });

                const before = extractDocumentRefs(snapshot.document);
                const after = extractDocumentRefs(next.document);

                expect(after.refs.characters).toEqual(before.refs.characters.map(id => lookup(maps.characters, id)));
                expect(after.refs.music).toEqual(before.refs.music.map(id => lookup(maps.music, id)));
                expect(after.refs.threads).toEqual(before.refs.threads.map(id => lookup(maps.threads, id)));
                expect(after.stripped).toEqual(before.stripped);
            }),
            parameters,
        );
    });

    it('leaves non-id data untouched', () => {
        fc.assert(
            fc.property(arbitraryStepkgSnapshot, snapshot => {
                const {snapshot: next} = remapStepkgIds(snapshot, makeNewId());

                expect(next.titlePage).toEqual(snapshot.titlePage);
                expect(next.script.title).toBe(snapshot.script.title);
                expect(next.characters.characters.map(row => row.key)).toEqual(snapshot.characters.characters.map(row => row.key));
                expect(next.music.items.map(row => [row.startBlockId, row.endBlockId]))
                    .toEqual(snapshot.music.items.map(row => [row.startBlockId, row.endBlockId]));
            }),
            parameters,
        );
    });
});

describe('remapStepkgBlockIds', () => {
    it('gives every top-level block a fresh unique id and every block reference follows it', () => {
        fc.assert(
            fc.property(arbitraryStepkgSnapshot, snapshot => {
                const next = remapStepkgBlockIds(snapshot, makeNewId());
                const oldIds = snapshot.document.content.map(node => String(node.attrs?.id));
                const newIds = next.document.content.map(node => String(node.attrs?.id));
                const map = new Map(oldIds.map((id, index) => [id, newIds[index]]));
                const follow = (id: string | null) => (id === null ? null : lookup(map, id));

                expect(new Set(newIds).size).toBe(newIds.length);
                newIds.forEach(id => expect(oldIds).not.toContain(id));
                expect(next.document.content.map(node => ({...node, attrs: {...node.attrs, id: ''}})))
                    .toEqual(snapshot.document.content.map(node => ({...node, attrs: {...node.attrs, id: ''}})));
                expect(next.music.items.map(row => [row.startBlockId, row.endBlockId]))
                    .toEqual(snapshot.music.items.map(row => [follow(row.startBlockId), follow(row.endBlockId)]));
                expect(next.scenes.scenes.map(row => row.headingBlockId)).toEqual(snapshot.scenes.scenes.map(row => follow(row.headingBlockId)));
                expect(next.sceneCharacters.items.map(row => row.headingBlockId))
                    .toEqual(snapshot.sceneCharacters.items.map(row => follow(row.headingBlockId)));
                expect(next.comments.threads.map(row => row.anchorBlockId)).toEqual(snapshot.comments.threads.map(row => follow(row.anchorBlockId)));
                expect(next.characters).toEqual(snapshot.characters);
                expect(next.script).toEqual(snapshot.script);
            }),
            parameters,
        );
    });
});
