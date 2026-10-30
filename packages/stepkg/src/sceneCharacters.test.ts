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
import {sha256Hex} from './sha256';
import {decodeStepkgSnapshotPayload, encodeStepkgSnapshotPayload} from './snapshotPayload';
import {validateStepkgSnapshot} from './validateSnapshot';

const timestamp = '2026-10-28T10:00:00.000Z';
const snapshot = (): StepkgSnapshot => ({
    script: {
        id: 's1',
        title: 'Test',
        subtitle: null,
        createdAt: timestamp,
        updatedAt: timestamp,
    },
    document: {type: 'doc', content: [{type: 'scene', attrs: {id: 'h1'}}]},
    titlePage: {},
    settings: {},
    characters: {
        characters: [
            {
                id: 'c1',
                key: 'ANNA',
                colorHex: null,
                genderKey: null,
                notes: null,
                backstory: null,
                outline: null,
                voiceType: null,
                vocalRangeLow: null,
                vocalRangeHigh: null,
                createdAt: timestamp,
                updatedAt: timestamp,
            },
        ],
        groups: [],
        genderOptions: [],
    },
    music: {items: []},
    scenes: {scenes: [], locations: []},
    sceneCharacters: {items: [
        {
            headingBlockId: 'h1',
            characterId: 'c1',
            note: 'Leaves',
            arcValue: -2,
            createdAt: timestamp,
            updatedAt: timestamp,
        },
    ]},
    attachments: [],
    attachmentBindings: [],
    comments: {threads: [], messages: []},
});
const exportBytes = async () => {
    const result = await createStepkg({
        snapshot: snapshot(),
        generator: {name: 'Test', version: '1'},
        createdAt: new Date(timestamp),
        loadAsset: () => Promise.resolve(null),
    });

    if (!result.ok) throw new Error(JSON.stringify(result.issues));

    return new Uint8Array(await result.blob.arrayBuffer());
};
const rewrite = async (value: unknown) => {
    const entries = unzipSync(await exportBytes());
    const manifest = JSON.parse(new TextDecoder().decode(entries['manifest.json'])) as StepkgManifest;
    const path = 'data/scene-characters.json';

    manifest.files = manifest.files.filter((file: {path: string}) => file.path !== path);

    if (value === undefined) delete entries[path];
    else {
        entries[path] = new TextEncoder().encode(JSON.stringify(value));
        manifest.files.push({
            path,
            byteLength: entries[path].length,
            sha256: await sha256Hex(entries[path]),
            mediaType: 'application/json',
        });
    }

    entries['manifest.json'] = new TextEncoder().encode(JSON.stringify(manifest));

    return zipSync(entries);
};

describe('scene character packages', () => {
    it('round-trips the optional file and snapshot payload', async () => {
        const result = await readStepkg(await exportBytes());

        expect(result.ok).toBe(true);

        if (result.ok) expect(result.package.snapshot.sceneCharacters).toEqual(snapshot().sceneCharacters);

        const decoded = decodeStepkgSnapshotPayload(encodeStepkgSnapshotPayload(snapshot()));

        expect(decoded.ok).toBe(true);

        if (decoded.ok) expect(decoded.snapshot.sceneCharacters).toEqual(snapshot().sceneCharacters);
    });
    it('defaults older packages and snapshot payloads to no records', async () => {
        const result = await readStepkg(await rewrite(undefined));

        expect(result.ok).toBe(true);

        if (result.ok) expect(result.package.snapshot.sceneCharacters).toEqual({items: []});

        const {sceneCharacters: _removed, ...oldSnapshot} = snapshot();
        const decoded = decodeStepkgSnapshotPayload(deflateSync(new TextEncoder().encode(JSON.stringify({
            format: 'stagistic-snapshot',
            formatVersion: 1,
            documentSchemaVersion: 4,
            snapshot: oldSnapshot,
        }))));

        expect(decoded.ok).toBe(true);

        if (decoded.ok) expect(decoded.snapshot.sceneCharacters).toEqual({items: []});
    });
    it('remaps headings and characters without changing note or arc', () => {
        const result = remapStepkgIds(remapStepkgBlockIds(snapshot(), () => 'new-heading'), () => 'new-id');

        expect(result.snapshot.sceneCharacters.items).toEqual([
            expect.objectContaining({
                headingBlockId: 'new-heading',
                characterId: 'new-id',
                note: 'Leaves',
                arcValue: -2,
            }),
        ]);
    });
    it('drops unknown headings and characters with warnings', async () => {
        const record = snapshot().sceneCharacters.items[0];
        const result = await readStepkg(await rewrite({items: [
            record,
            {...record, headingBlockId: 'missing'},
            {...record, characterId: 'missing'},
        ]}));

        expect(result.ok).toBe(true);

        if (result.ok) {
            expect(result.package.snapshot.sceneCharacters.items).toEqual([record]);
            expect(result.issues).toHaveLength(2);
            expect(result.issues.every(issue => issue.code === 'broken_reference')).toBe(true);
        }
    });
    it.each([
        4,
        -4,
        1.5,
    ])('rejects arc %s on export and import', async arcValue => {
        const source = snapshot();

        source.sceneCharacters.items[0].arcValue = arcValue;
        expect(validateStepkgSnapshot(source)).toEqual(expect.arrayContaining([expect.objectContaining({code: 'invalid_snapshot'})]));

        const result = await readStepkg(await rewrite(source.sceneCharacters));

        expect(result.ok).toBe(false);
    });
});
