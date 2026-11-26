import {spawnSync} from 'node:child_process';
import {
    existsSync,
    mkdtempSync,
    readdirSync,
    rmSync,
    statSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {
    checkArchitectures,
    checkBridgeTeam,
    checkBundleId,
    checkMinimumSystem,
    type CheckResult,
    checkSigningKind,
    checkSpctl,
    checkStapler,
    checkVersion,
    fail,
    parseCodesign,
    pass,
    skip,
} from './verifyLib';

export const exec = (command: string, args: string[]): {
    status: number,
    output: string,
    stdout: string,
} => {
    const result = spawnSync(command, args, {encoding: 'utf8'});

    return {
        status: result.status ?? 1,
        output: `${result.stdout}${result.stderr}`,
        stdout: result.stdout,
    };
};

const plist = (infoPlist: string, key: string): string => {
    const result = exec('plutil', [
        '-extract',
        key,
        'raw',
        '-o',
        '-',
        infoPlist,
    ]);

    return result.status === 0 ? result.stdout.trim() : '';
};

const findFile = (dir: string, name: string): string | undefined => {
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry);

        if (entry === name && statSync(path).isFile()) {
            return path;
        }

        if (statSync(path).isDirectory()) {
            const found = findFile(path, name);

            if (found !== undefined) {
                return found;
            }
        }
    }

    return undefined;
};

export const checkApp = (app: string, options: {version?: string, allowAdHoc: boolean}): CheckResult[] => {
    const results: CheckResult[] = [];
    const infoPlist = join(app, 'Contents/Info.plist');

    if (!existsSync(infoPlist)) {
        return [fail('app', `no Contents/Info.plist in ${app}`)];
    }

    const binaryName = plist(infoPlist, 'CFBundleExecutable');
    const binary = join(app, 'Contents/MacOS', binaryName);

    results.push(
        checkBundleId(plist(infoPlist, 'CFBundleIdentifier')),
        checkVersion(plist(infoPlist, 'CFBundleShortVersionString'), options.version),
        checkMinimumSystem(plist(infoPlist, 'LSMinimumSystemVersion')),
        checkArchitectures(exec('lipo', ['-archs', binary]).output),
    );

    const verify = exec('codesign', [
        '--verify',
        '--deep',
        '--strict',
        app,
    ]);

    results.push(verify.status === 0 ? pass('codesign-verify', 'deep, strict') : fail('codesign-verify', verify.output.trim()));

    const info = parseCodesign(exec('codesign', [
        '-dv',
        '--verbose=2',
        app,
    ]).output);
    const signing = checkSigningKind(info, options.allowAdHoc);

    results.push(signing);

    if (info.kind !== 'developer-id') {
        for (const name of [
            'gatekeeper',
            'stapler-app',
            'mcp-bridge-signing',
        ]) {
            results.push(skip(name, `${info.kind} build`));
        }

        return results;
    }

    const spctl = exec('spctl', [
        '--assess',
        '--type',
        'execute',
        '-vv',
        app,
    ]);

    results.push(
        checkSpctl(spctl.output, spctl.status),
        (() => {
            const stapler = exec('xcrun', [
                'stapler',
                'validate',
                app,
            ]);

            return checkStapler('stapler-app', stapler.output, stapler.status);
        })(),
    );

    const bridge = findFile(join(app, 'Contents'), 'stagistic-mcp');

    results.push(bridge === undefined ? fail('mcp-bridge-signing', 'stagistic-mcp not found in the bundle') : checkBridgeTeam(info, parseCodesign(exec('codesign', [
        '-dv',
        '--verbose=2',
        bridge,
    ]).output)));

    return results;
};

export const checkDmg = (dmg: string, options: {version?: string, allowAdHoc: boolean}): CheckResult[] => {
    if (!existsSync(dmg)) {
        return [fail('dmg', `file not found: ${dmg}`)];
    }

    const mount = mkdtempSync(join(tmpdir(), 'stagistic-verify-'));
    const attach = exec('hdiutil', [
        'attach',
        '-nobrowse',
        '-readonly',
        '-mountpoint',
        mount,
        dmg,
    ]);

    if (attach.status !== 0) {
        rmSync(mount, {
            recursive: true,
            force: true,
        });

        return [fail('dmg-mount', attach.output.trim())];
    }

    try {
        const apps = readdirSync(mount).filter(name => name.endsWith('.app'));

        if (apps.length !== 1) {
            return [fail('dmg-app', `expected one .app in the DMG, found ${apps.length}`)];
        }

        const results = [pass('dmg-app', apps[0]), ...checkApp(join(mount, apps[0]), options)];

        if (parseCodesign(exec('codesign', [
            '-dv',
            '--verbose=2',
            join(mount, apps[0]),
        ]).output).kind === 'developer-id') {
            const stapler = exec('xcrun', [
                'stapler',
                'validate',
                dmg,
            ]);

            results.push(checkStapler('stapler-dmg', stapler.output, stapler.status));
        } else {
            results.push(skip('stapler-dmg', 'not a Developer ID build'));
        }

        return results;
    } finally {
        exec('hdiutil', [
            'detach',
            mount,
            '-force',
        ]);
        rmSync(mount, {
            recursive: true,
            force: true,
        });
    }
};

