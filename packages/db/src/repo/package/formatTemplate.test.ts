import {parseStagistic} from '@stagistic/script';
import {requireValue} from '@stagistic/shared';
import {expect, it} from 'vite-plus/test';

import {InMemoryFileStorage} from '../../storage/fileStorage';
import {createTestDb} from '../../testing/createTestDb';
import {readScriptFormatTemplateId, setScriptFormatTemplateId} from '../config/formatTemplate';
import {createLocalPgliteRepository} from '../createLocalPgliteRepository';

it('round-trips the locked template through a package source and import', async () => {
    const {db} = await createTestDb();
    const repository = createLocalPgliteRepository({
        getLocalDb: () => Promise.resolve(db),
        syncToFs: () => Promise.resolve(),
        fileStorage: new InMemoryFileStorage(),
    });

    await repository.createScriptWithId({
        id: 'source',
        title: 'Source',
        initialContent: parseStagistic('# Act One\n\n## Scene One\n\nHello.').document,
    });
    await setScriptFormatTemplateId(db, 'source', 'samuel-french', Date.now());

    const source = await repository.getScriptPackageSource('source');

    expect(source?.script.formatTemplateId).toBe('samuel-french');
    await repository.createScriptFromPackage({
        script: {...requireValue(source).script, id: 'copy'},
        document: requireValue(source).document,
        titlePage: {},
        settings: {},
        characters: [],
        groups: [],
        genders: [],
        music: [],
        locations: [],
        scenes: [],
        sceneCharacters: [],
        attachments: [],
        bindings: [],
        comments: {threads: [], messages: []},
    });
    expect(await readScriptFormatTemplateId(db, 'copy')).toBe('samuel-french');
    await setScriptFormatTemplateId(db, 'copy', null, Date.now());
    expect(await readScriptFormatTemplateId(db, 'copy')).toBeNull();
});

it('creates a script already locked to DG Musical in one transaction', async () => {
    const {db} = await createTestDb();
    const repository = createLocalPgliteRepository({
        getLocalDb: () => Promise.resolve(db),
        syncToFs: () => Promise.resolve(),
        fileStorage: new InMemoryFileStorage(),
    });

    await repository.createScriptWithId({
        id: 'musical',
        title: 'Musical',
        format: {templateId: 'dg-musical', lock: true},
        initialContent: parseStagistic('## Scene One\n\nHello.').document,
    });

    const source = await repository.getScriptPackageSource('musical');

    expect(source?.script.formatTemplateId).toBe('dg-musical');
    expect(source?.settings.blocks?.lyrics?.indentLeftChars).toBeUndefined();
});
