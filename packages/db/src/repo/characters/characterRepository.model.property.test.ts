import {oracleParameters} from '@stagistic/test-oracles';
import * as fc from 'fast-check';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {InMemoryFileStorage} from '../../storage/fileStorage';
import {createLiveTestDb} from '../../testing/createLiveTestDb';
import {seedScript} from '../../testing/createTestDb';
import type {ScriptCharacterGroupRef, ScriptCharacterRef} from '../../types';
import {createLocalPgliteRepository} from '../createLocalPgliteRepository';

/*
 * Reference-model oracle (tier c, docs/testing-oracles.md) for the character and character-group
 * commands of ScriptRepository, on PGlite. A strict Map model written from the rules below is run
 * next to the real repository through fc.asyncModelRun; after every command the repository reads
 * and every reactive source (characters, groups, genders) must equal the model and a direct read.
 *
 * Rules (the model implements only these, not production helpers):
 * - Characters and groups share one key namespace per script; a key is held by at most one of them.
 * - Insert requires an absent key; update and delete require a present id (strict Map).
 * - confirm: absent key -> new character; key of a character -> unchanged (colour and outline kept); key of a group -> rejected.
 * - rename character: same key -> unchanged; key of a group -> rejected; key of another character ->
 *   merge (the renamed one disappears, the target keeps its id and data).
 * - create group: key must be absent. rename group: key must be absent or its own.
 * - replace members: all ids must be existing characters, else rejected; stored as a set.
 * - delete character: removes it from every group. Missing ids are no-ops (null result).
 *
 * One live PGlite database serves the file; every run writes its own script and prefixes its ids.
 */

const parameters = oracleParameters('pglite');
const TIMEOUT_MS = 600_000;
const GHOST = 'ghost-never-created';

type Repository = ReturnType<typeof createLocalPgliteRepository>;

let repository: Repository;
let seed: (scriptId: string) => Promise<void>;
let close: () => Promise<void>;
let runCounter = 0;

beforeAll(async () => {
    const {db, client} = await createLiveTestDb();

    repository = createLocalPgliteRepository({
        getLocalDb: () => Promise.resolve(db),
        syncToFs: () => Promise.resolve(),
        fileStorage: new InMemoryFileStorage(),
    });
    seed = scriptId => seedScript(db, scriptId);
    close = () => client.close();
});

afterAll(async () => {
    await close();
});

interface CharacterRecord {
    key: string, colorHex: string | null, outline: string | null,
}
interface GroupRecord {
    key: string, colorHex: string | null, members: Set<string>,
}

class CharacterModel {
    readonly characters = new Map<string, CharacterRecord>();

    readonly groups = new Map<string, GroupRecord>();

    private counter = 0;

    constructor(readonly prefix: string) {}

    nextId() {
        this.counter += 1;

        return `${this.prefix}${this.counter}`;
    }

    /* Strict primitives: they throw on a violated precondition, so the model never hides an invalid operation. */
    insertCharacter(id: string, record: CharacterRecord) {
        if (this.characters.has(id)) {
            throw new Error(`model: insert of present character ${id}`);
        }

        this.characters.set(id, record);
    }

    updateCharacter(id: string, patch: Partial<CharacterRecord>) {
        const current = this.characters.get(id);

        if (!current) {
            throw new Error(`model: update of absent character ${id}`);
        }

        this.characters.set(id, {...current, ...patch});
    }

    removeCharacter(id: string) {
        if (!this.characters.delete(id)) {
            throw new Error(`model: delete of absent character ${id}`);
        }

        this.groups.forEach(group => group.members.delete(id));
    }

    insertGroup(id: string, record: Omit<GroupRecord, 'members'>) {
        if (this.groups.has(id)) {
            throw new Error(`model: insert of present group ${id}`);
        }

        this.groups.set(id, {...record, members: new Set()});
    }

    updateGroup(id: string, patch: Partial<GroupRecord>) {
        const current = this.groups.get(id);

        if (!current) {
            throw new Error(`model: update of absent group ${id}`);
        }

        this.groups.set(id, {...current, ...patch});
    }

    removeGroup(id: string) {
        if (!this.groups.delete(id)) {
            throw new Error(`model: delete of absent group ${id}`);
        }
    }

    /* Key lookups over both kinds. */
    holderOf(key: string): {kind: 'character' | 'group', id: string} | null {
        for (const [id, record] of this.characters) {
            if (record.key === key) {
                return {kind: 'character', id};
            }
        }

        for (const [id, record] of this.groups) {
            if (record.key === key) {
                return {kind: 'group', id};
            }
        }

        return null;
    }

    characterRef(id: string): ScriptCharacterRef | null {
        const record = this.characters.get(id);

        return record
            ? {
                id,
                kind: 'character',
                key: record.key,
                colorHex: record.colorHex,
                genderKey: null,
                notes: null,
                backstory: null,
                outline: record.outline,
                voiceType: null,
                vocalRangeLow: null,
                vocalRangeHigh: null,
            }
            : null;
    }

    groupRef(id: string): ScriptCharacterGroupRef | null {
        const record = this.groups.get(id);

        return record
            ? {
                id,
                kind: 'group',
                key: record.key,
                colorHex: record.colorHex,
                memberIds: [...record.members].toSorted(),
            }
            : null;
    }

    /* Commands: apply the rules, return the expected repository result. */
    confirm(id: string, key: string, colorHex: string | null) {
        const holder = this.holderOf(key);

        if (holder?.kind === 'group') {
            return null;
        }

        if (holder) {
            return this.characterRef(holder.id);
        }

        this.insertCharacter(id, {
            key,
            colorHex,
            outline: null,
        });

        return this.characterRef(id);
    }

    renameCharacter(id: string, key: string) {
        const current = this.characters.get(id);

        if (!current) {
            return null;
        }

        if (current.key === key) {
            return this.characterRef(id);
        }

        const holder = this.holderOf(key);

        if (holder?.kind === 'group') {
            return null;
        }

        if (holder) {
            this.removeCharacter(id);

            return this.characterRef(holder.id);
        }

        this.updateCharacter(id, {key});

        return this.characterRef(id);
    }

    deleteCharacter(id: string) {
        if (this.characters.has(id)) {
            this.removeCharacter(id);
        }
    }

    setCharacterColor(id: string, colorHex: string | null) {
        if (!this.characters.has(id)) {
            return null;
        }

        this.updateCharacter(id, {colorHex});

        return this.characterRef(id);
    }

    setCharacterOutline(id: string, outline: string | null) {
        if (!this.characters.has(id)) {
            return null;
        }

        this.updateCharacter(id, {outline});

        return this.characterRef(id);
    }

    createGroup(id: string, key: string, colorHex: string | null) {
        if (this.holderOf(key)) {
            return null;
        }

        this.insertGroup(id, {key, colorHex});

        return this.groupRef(id);
    }

    renameGroup(id: string, key: string) {
        const current = this.groups.get(id);

        if (!current) {
            return null;
        }

        const holder = this.holderOf(key);

        if (holder && !(holder.kind === 'group' && holder.id === id)) {
            return null;
        }

        this.updateGroup(id, {key});

        return this.groupRef(id);
    }

    deleteGroup(id: string) {
        if (this.groups.has(id)) {
            this.removeGroup(id);
        }
    }

    setGroupColor(id: string, colorHex: string | null) {
        if (!this.groups.has(id)) {
            return null;
        }

        this.updateGroup(id, {colorHex});

        return this.groupRef(id);
    }

    replaceMembers(id: string, memberIds: string[]) {
        if (!this.groups.has(id) || memberIds.some(memberId => !this.characters.has(memberId))) {
            return null;
        }

        this.updateGroup(id, {members: new Set(memberIds)});

        return this.groupRef(id);
    }
}

describe('character reference model', () => {
    it('rejects an invalid update, delete and insert', () => {
        const model = new CharacterModel('m-');

        expect(() => model.updateCharacter('absent', {colorHex: null})).toThrow(/absent character/u);
        expect(() => model.removeCharacter('absent')).toThrow(/absent character/u);
        expect(() => model.updateGroup('absent', {colorHex: null})).toThrow(/absent group/u);
        expect(() => model.removeGroup('absent')).toThrow(/absent group/u);

        model.insertCharacter('c', {
            key: 'A',
            colorHex: null,
            outline: null,
        });

        expect(() => model.insertCharacter('c', {
            key: 'B',
            colorHex: null,
            outline: null,
        })).toThrow(/present character/u);
    });

    it('deleting a character removes it from all groups', () => {
        const model = new CharacterModel('m-');

        model.confirm('c1', 'A', null);
        model.confirm('c2', 'B', null);
        model.createGroup('g1', 'ALL', null);
        model.createGroup('g2', 'SOME', null);
        model.replaceMembers('g1', ['c1', 'c2']);
        model.replaceMembers('g2', ['c1']);
        model.deleteCharacter('c1');

        expect(model.groupRef('g1')?.memberIds).toEqual(['c2']);
        expect(model.groupRef('g2')?.memberIds).toEqual([]);
    });
});

/* Latest snapshot of one reactive source, rebuilt from its subscription. */
interface Subscribed<T> {
    latest: () => readonly T[] | null,
    stop: () => void,
}

const subscribeTo = async <T>(source: {
    subscribe: (listener: (rows: readonly T[]) => void) => Promise<() => void>,
}): Promise<Subscribed<T>> => {
    let latest: readonly T[] | null = null;
    const stop = await source.subscribe(rows => {
        latest = rows;
    });

    return {latest: () => latest, stop};
};

interface Real {
    scriptId: string,
    characters: Subscribed<ScriptCharacterRef>,
    groups: Subscribed<ScriptCharacterGroupRef>,
    genders: Subscribed<unknown>,
}

const byId = <T extends {id: string}>(rows: readonly T[]) => [...rows].toSorted((a, b) => a.id.localeCompare(b.id));
const normalizeGroups = (rows: readonly ScriptCharacterGroupRef[]) => byId(rows).map(row => ({...row, memberIds: [...row.memberIds].toSorted()}));
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/* A reactive source equals the direct read once its latest snapshot settles; a snapshot that never does fails. */
const expectSourceEquals = async <T>(
    name: string,
    subscribed: Subscribed<T>,
    direct: () => Promise<readonly T[]>,
    normalize: (rows: readonly T[]) => unknown,
) => {
    const deadline = Date.now() + 5000;
    let expected = normalize(await direct());

    for (;;) {
        const latest = subscribed.latest();

        if (latest && JSON.stringify(normalize(latest)) === JSON.stringify(expected)) {
            return;
        }

        if (Date.now() >= deadline) {
            expect({source: name, rows: latest && normalize(latest)}).toEqual({source: name, rows: expected});

            return;
        }

        await sleep(5);
        expected = normalize(await direct());
    }
};

const expectDefined = <T>(value: T | null): T => {
    if (value === null) {
        throw new Error('model: missing record');
    }

    return value;
};

const verify = async (model: CharacterModel, real: Real) => {
    const characters = await repository.listScriptCharacters(real.scriptId);
    const groups = await repository.listScriptCharacterGroups(real.scriptId);

    expect(byId(characters)).toEqual(byId([...model.characters.keys()].map(id => expectDefined(model.characterRef(id)))));
    expect(normalizeGroups(groups)).toEqual(normalizeGroups([...model.groups.keys()].map(id => expectDefined(model.groupRef(id)))));

    await expectSourceEquals('characters', real.characters, () => repository.listScriptCharacters(real.scriptId), byId);
    await expectSourceEquals('groups', real.groups, () => repository.listScriptCharacterGroups(real.scriptId), normalizeGroups);
    await expectSourceEquals('genders', real.genders, () => repository.listScriptCharacterGenders(real.scriptId), rows => rows);
};

const KEYS = [
    'ANNA',
    'BOB',
    'CARL',
    'DORA',
];
const COLORS = [
    null,
    '#112233',
    '#aabbcc',
];

const OUTLINES = [
    null,
    'Arc one',
    'Arc two',
];

const arbitraryKey = fc.constantFrom(...KEYS);
const arbitraryOutline = fc.constantFrom(...OUTLINES);
const arbitraryColor = fc.constantFrom(...COLORS);
/* `pick` is an index into the existing ids at run time (or the id of an entity that never exists). */
const arbitraryPick = fc.oneof({weight: 8, arbitrary: fc.nat({max: 20})}, {weight: 1, arbitrary: fc.constant('ghost' as const)});

type Pick = number | 'ghost';

const resolve = (ids: Iterable<string>, pick: Pick) => {
    if (pick === 'ghost') {
        return GHOST;
    }

    const sorted = [...ids].toSorted();

    return sorted[pick % sorted.length];
};
const canPick = (ids: {size: number}, pick: Pick) => pick === 'ghost' || ids.size > 0;

type Command = fc.AsyncCommand<CharacterModel, Real>;

const command = (
    label: string,
    precondition: (model: CharacterModel) => boolean,
    run: (model: CharacterModel, real: Real) => Promise<void>,
): Command => ({
    check: precondition,
    run: async (model, real) => {
        await run(model, real);
        await verify(model, real);
    },
    toString: () => label,
});

const arbitraryCommands: Array<fc.Arbitrary<Command>> = [
    fc.record({key: arbitraryKey, color: arbitraryColor}).map(({key, color}) => command(
        `confirm(${key}, ${color})`,
        () => true,
        async (model, real) => {
            const id = model.nextId();
            const expected = model.confirm(id, key, color);

            expect(await repository.confirmScriptCharacterWithId(real.scriptId, {
                id,
                key,
                colorHex: color,
            })).toEqual(expected);
        },
    )),
    fc.record({pick: arbitraryPick, key: arbitraryKey}).map(({pick, key}) => command(
        `renameCharacter(${pick}, ${key})`,
        model => canPick(model.characters, pick),
        async (model, real) => {
            const id = resolve(model.characters.keys(), pick);
            const expected = model.renameCharacter(id, key);

            expect(await repository.renameScriptCharacter(real.scriptId, id, key)).toEqual(expected);
        },
    )),
    arbitraryPick.map(pick => command(
        `deleteCharacter(${pick})`,
        model => canPick(model.characters, pick),
        async (model, real) => {
            const id = resolve(model.characters.keys(), pick);

            model.deleteCharacter(id);
            await repository.deleteScriptCharacter(real.scriptId, id);
        },
    )),
    fc.record({pick: arbitraryPick, color: arbitraryColor}).map(({pick, color}) => command(
        `setCharacterColor(${pick}, ${color})`,
        model => canPick(model.characters, pick),
        async (model, real) => {
            const id = resolve(model.characters.keys(), pick);
            const expected = model.setCharacterColor(id, color);

            expect(await repository.setScriptCharacterColor(real.scriptId, id, color)).toEqual(expected);
        },
    )),
    fc.record({pick: arbitraryPick, outline: arbitraryOutline}).map(({pick, outline}) => command(
        `setCharacterOutline(${pick}, ${outline})`,
        model => canPick(model.characters, pick),
        async (model, real) => {
            const id = resolve(model.characters.keys(), pick);
            const expected = model.setCharacterOutline(id, outline);

            expect(await repository.setScriptCharacterOutline(real.scriptId, id, outline)).toEqual(expected);
        },
    )),
    fc.record({key: arbitraryKey, color: arbitraryColor}).map(({key, color}) => command(
        `createGroup(${key}, ${color})`,
        () => true,
        async (model, real) => {
            const id = model.nextId();
            const expected = model.createGroup(id, key, color);

            expect(await repository.createScriptCharacterGroupWithId(real.scriptId, {
                id,
                key,
                colorHex: color,
            })).toEqual(expected);
        },
    )),
    fc.record({pick: arbitraryPick, key: arbitraryKey}).map(({pick, key}) => command(
        `renameGroup(${pick}, ${key})`,
        model => canPick(model.groups, pick),
        async (model, real) => {
            const id = resolve(model.groups.keys(), pick);
            const expected = model.renameGroup(id, key);

            expect(await repository.renameScriptCharacterGroup(real.scriptId, id, key)).toEqual(expected);
        },
    )),
    arbitraryPick.map(pick => command(
        `deleteGroup(${pick})`,
        model => canPick(model.groups, pick),
        async (model, real) => {
            const id = resolve(model.groups.keys(), pick);

            model.deleteGroup(id);
            await repository.deleteScriptCharacterGroup(real.scriptId, id);
        },
    )),
    fc.record({pick: arbitraryPick, color: arbitraryColor}).map(({pick, color}) => command(
        `setGroupColor(${pick}, ${color})`,
        model => canPick(model.groups, pick),
        async (model, real) => {
            const id = resolve(model.groups.keys(), pick);
            const expected = model.setGroupColor(id, color);

            expect(await repository.setScriptCharacterGroupColor(real.scriptId, id, color)).toEqual(expected);
        },
    )),
    fc.record({
        pick: arbitraryPick,
        members: fc.array(arbitraryPick, {maxLength: 4}),
    }).map(({pick, members}) => command(
        `replaceMembers(${pick}, [${members.join(',')}])`,
        model => canPick(model.groups, pick) && members.every(member => canPick(model.characters, member)),
        async (model, real) => {
            const id = resolve(model.groups.keys(), pick);
            const memberIds = members.map(member => resolve(model.characters.keys(), member));
            const expected = model.replaceMembers(id, memberIds);

            expect(await repository.replaceScriptCharacterGroupMembers(real.scriptId, id, memberIds)).toEqual(expected);
        },
    )),
];

const setup = async () => {
    runCounter += 1;

    const scriptId = `characters-run-${runCounter}`;

    await seed(scriptId);

    const characters = await subscribeTo<ScriptCharacterRef>(repository.getScriptCharactersSource(scriptId));
    const groups = await subscribeTo<ScriptCharacterGroupRef>(repository.getScriptCharacterGroupsSource(scriptId));
    const genders = await subscribeTo<unknown>(repository.getScriptCharacterGendersSource(scriptId));

    return {
        model: new CharacterModel(`${scriptId}-`),
        real: {
            scriptId,
            characters,
            groups,
            genders,
        } satisfies Real,
    };
};

describe('character and group commands against the reference model', () => {
    it('match the model and every reactive source after each command', async () => {
        await fc.assert(
            fc.asyncProperty(fc.commands(arbitraryCommands, {maxCommands: 14}), async commands => {
                const {model, real} = await setup();

                try {
                    await fc.asyncModelRun(() => ({model, real}), commands);
                } finally {
                    real.characters.stop();
                    real.groups.stop();
                    real.genders.stop();
                }
            }),
            parameters,
        );
    }, TIMEOUT_MS);
});

describe('counterexamples', () => {
    /* F6: confirming an existing character keeps its row (colour, gender, notes, outline, voice). */
    it('keeps the colour and outline of an already confirmed character on a repeated confirm', async () => {
        const scriptId = 'characters-f6';

        await seed(scriptId);

        const created = await repository.confirmScriptCharacterWithId(scriptId, {
            id: 'f6-anna',
            key: 'ANNA',
            colorHex: '#112233',
        });

        await repository.setScriptCharacterOutline(scriptId, 'f6-anna', 'Arc one');

        const again = await repository.confirmScriptCharacter(scriptId, 'ANNA');

        expect(created?.colorHex).toBe('#112233');
        expect(again).toMatchObject({
            id: 'f6-anna',
            colorHex: '#112233',
            outline: 'Arc one',
        });
    });

    /* Saved from a model run: [confirm ANNA, confirm DORA, renameCharacter(0, DORA)] merges into the target. */
    it('merges a renamed character into the existing one and keeps the target data', async () => {
        const scriptId = 'characters-merge';

        await seed(scriptId);
        await repository.confirmScriptCharacterWithId(scriptId, {
            id: 'merge-anna',
            key: 'ANNA',
            colorHex: '#112233',
        });
        await repository.confirmScriptCharacterWithId(scriptId, {
            id: 'merge-dora',
            key: 'DORA',
            colorHex: '#aabbcc',
        });
        await repository.setScriptCharacterOutline(scriptId, 'merge-anna', 'Anna arc');
        await repository.setScriptCharacterOutline(scriptId, 'merge-dora', 'Dora arc');

        const merged = await repository.renameScriptCharacter(scriptId, 'merge-anna', 'DORA');
        const characters = await repository.listScriptCharacters(scriptId);

        expect(merged).toMatchObject({
            id: 'merge-dora',
            key: 'DORA',
            colorHex: '#aabbcc',
            outline: 'Dora arc',
        });
        expect(characters.map(character => character.id)).toEqual(['merge-dora']);
    });
});
