import assert from 'node:assert/strict';
import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    symlinkSync,
    writeFileSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
    afterEach,
    describe,
    it,
} from 'node:test';

import {acceptUpstream, checkUpstream} from '../lib/lock.mjs';
import {
    FlowError,
    resolvePluginRoot,
    skillDir,
} from '../lib/upstream.mjs';

const PLUGIN = 'mattpocock-skills@claude-plugins-official';
const temporaryDirs = [];

afterEach(() => {
    for (const dir of temporaryDirs.splice(0)) {
        rmSync(dir, {recursive: true, force: true});
    }
});

const temporaryDir = prefix => {
    const dir = mkdtempSync(path.join(tmpdir(), prefix));

    temporaryDirs.push(dir);

    return dir;
};

const write = (file, content) => {
    mkdirSync(path.dirname(file), {recursive: true});
    writeFileSync(file, content);
};

/** Fake home with an installed plugin and a repo using it. */
const setup = ({scope = 'project'} = {}) => {
    const home = temporaryDir('agent-flows-home-');
    const cwd = temporaryDir('agent-flows-repo-');
    const root = path.join(home, '.claude', 'plugins', 'cache', 'claude-plugins-official', 'mattpocock-skills', '1.3.1');

    write(path.join(root, 'skills', 'engineering', 'tdd', 'SKILL.md'), '---\nname: tdd\n---\nRed before green.\n');
    write(path.join(root, 'skills', 'engineering', 'tdd', 'tests.md'), 'Good tests.\n');
    write(path.join(root, 'skills', 'productivity', 'grilling', 'SKILL.md'), '---\nname: grilling\n---\nAsk.\n');
    write(path.join(home, '.claude', 'plugins', 'installed_plugins.json'), JSON.stringify({
        version: 2,
        plugins: {
            [PLUGIN]: [
                {
                    scope,
                    installPath: root,
                    version: '1.3.1',
                    ...scope === 'project' ? {projectPath: cwd} : {},
                },
            ],
        },
    }));

    const toolDir = path.join(cwd, 'tool');

    write(path.join(toolDir, 'flows.json'), JSON.stringify({plugin: PLUGIN, skills: ['tdd', 'grilling']}));

    return {
        home,
        cwd,
        root,
        options: {
            home,
            cwd,
            toolDir,
        },
    };
};

describe('resolvePluginRoot', () => {
    it('recognizes a repository opened through a symlink', () => {
        const {
            home,
            cwd,
            root,
        } = setup();
        const alias = path.join(home, 'repo-alias');

        symlinkSync(cwd, alias);

        assert.equal(resolvePluginRoot({
            home,
            cwd: alias,
            plugin: PLUGIN,
        }).root, root);
    });

    it('prefers this project over a user install, independent of registry order', () => {
        const {
            home,
            cwd,
            root,
        } = setup();
        const registry = path.join(home, '.claude', 'plugins', 'installed_plugins.json');
        const data = JSON.parse(readFileSync(registry, 'utf8'));

        data.plugins[PLUGIN].unshift({
            scope: 'user',
            installPath: home,
            version: 'other',
        });
        writeFileSync(registry, JSON.stringify(data));

        assert.equal(resolvePluginRoot({
            home,
            cwd,
            plugin: PLUGIN,
        }).root, root);
    });

    it('finds the project-scoped install for this repository', () => {
        const {
            home,
            cwd,
            root,
        } = setup();

        assert.deepEqual(resolvePluginRoot({
            home,
            cwd,
            plugin: PLUGIN,
        }), {root, version: '1.3.1'});
    });

    it('accepts a user-scoped install', () => {
        const {
            home,
            cwd,
            root,
        } = setup({scope: 'user'});

        assert.equal(resolvePluginRoot({
            home,
            cwd,
            plugin: PLUGIN,
        }).root, root);
    });

    it('ignores a project install of another repository', () => {
        const {home} = setup();
        const other = temporaryDir('agent-flows-other-');

        assert.throws(() => resolvePluginRoot({
            home,
            cwd: other,
            plugin: PLUGIN,
        }), FlowError);
    });

    it('explains how to install when missing', () => {
        const home = temporaryDir('agent-flows-empty-');

        assert.throws(() => resolvePluginRoot({
            home,
            cwd: home,
            plugin: PLUGIN,
        }), /claude plugin install mattpocock-skills@claude-plugins-official --scope project/);
    });
});

describe('skillDir', () => {
    it('rejects traversal outside skill directories', () => {
        const {root} = setup();

        assert.throws(() => skillDir(root, '../engineering/tdd'), /invalid skill name/);
    });

    it('supports flat skill layouts without category folders', () => {
        const {root} = setup();

        write(path.join(root, 'skills', 'flat', 'SKILL.md'), 'flat\n');
        assert.equal(skillDir(root, 'flat'), path.join(root, 'skills', 'flat'));
    });

    it('finds a skill in any category', () => {
        const {root} = setup();

        assert.equal(skillDir(root, 'grilling'), path.join(root, 'skills', 'productivity', 'grilling'));
        assert.throws(() => skillDir(root, 'ghost'), /skill ghost not found/);
    });
});

describe('upstream lock', () => {
    it('detects a version change even when skill content is identical', () => {
        const {options, home} = setup();

        acceptUpstream(options);

        const registry = path.join(home, '.claude', 'plugins', 'installed_plugins.json');
        const data = JSON.parse(readFileSync(registry, 'utf8'));

        data.plugins[PLUGIN][0].version = '1.3.2';
        writeFileSync(registry, JSON.stringify(data));

        const result = checkUpstream(options);

        assert.equal(result.clean, false);
        assert.equal(result.version, '1.3.2');
        assert.equal(result.lockedVersion, '1.3.1');
    });

    it('detects a changed monitored skill set without silently accepting it', () => {
        const {options} = setup();

        acceptUpstream(options);

        assert.equal(checkUpstream({...options, skills: ['tdd']}).clean, false);
    });

    it('includes deleted reference files in the diff', () => {
        const {options, root} = setup();

        acceptUpstream(options);
        rmSync(path.join(root, 'skills', 'engineering', 'tdd', 'tests.md'));

        const result = checkUpstream(options);

        assert.deepEqual(result.changed[0].files, ['tests.md']);
        assert.match(result.changed[0].diff, /-Good tests\./);
    });

    it('is clean right after accept', () => {
        const {options} = setup();

        acceptUpstream(options);

        const result = checkUpstream(options);

        assert.deepEqual(result.changed, []);
        assert.deepEqual(result.missing, []);
        assert.equal(result.clean, true);
    });

    it('reports an unreviewed plugin before the first accept', () => {
        const {options} = setup();
        const result = checkUpstream(options);

        assert.equal(result.clean, false);
        assert.deepEqual(result.changed.map(({skill}) => skill), ['tdd', 'grilling']);
    });

    it('reports a changed file with a diff', () => {
        const {options, root} = setup();

        acceptUpstream(options);
        writeFileSync(path.join(root, 'skills', 'engineering', 'tdd', 'tests.md'), 'Good tests.\nCommit your work.\n');

        const result = checkUpstream(options);

        assert.equal(result.clean, false);
        assert.deepEqual(result.changed.map(({skill, files}) => [skill, files]), [['tdd', ['tests.md']]]);
        assert.match(result.changed[0].diff, /\+Commit your work\./);
    });

    it('reports added files and a missing skill', () => {
        const {options, root} = setup();

        acceptUpstream(options);
        write(path.join(root, 'skills', 'engineering', 'tdd', 'new.md'), 'new\n');

        const result = checkUpstream({
            ...options,
            skills: [
                'tdd',
                'grilling',
                'ghost',
            ],
        });

        assert.deepEqual(result.changed.find(({skill}) => skill === 'tdd').files, ['new.md']);
        assert.deepEqual(result.missing, ['ghost']);
    });

    it('stores reviewed copies next to the lock', () => {
        const {options} = setup();

        acceptUpstream(options);

        const lock = JSON.parse(readFileSync(path.join(options.toolDir, 'upstream.lock.json'), 'utf8'));

        assert.equal(lock.version, '1.3.1');
        assert.deepEqual(Object.keys(lock.skills), ['tdd', 'grilling']);
        assert.equal(readFileSync(path.join(options.toolDir, 'upstream-reviewed', 'tdd', 'tests.md'), 'utf8'), 'Good tests.\n');
    });
});
