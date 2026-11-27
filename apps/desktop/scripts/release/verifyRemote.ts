import {
    existsSync,
    mkdtempSync,
    readFileSync,
    rmSync,
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {
    ASSET_NAMES,
    REPOSITORY,
} from './lib';
import {checkDmg, exec} from './verifyArtifacts';
import {
    checkAssetSet,
    checkContains,
    checkDownloadRedirect,
    checkDraftState,
    checkLatestJson,
    checkLiveLatest,
    checkNotice,
    type CheckResult,
    checkStatus,
    checkWebVersion,
    fail,
} from './verifyLib';

const SITE = 'https://stagistic.com';
const WEB_APP = 'https://editor.stagistic.app';
const DOCS = 'https://docs.stagistic.com';

export const checkDraft = (tag: string, allowAdHoc: boolean): CheckResult[] => {
    const version = tag.slice(1);
    const view = exec('gh', [
        'release',
        'view',
        tag,
        '--repo',
        REPOSITORY,
        '--json',
        'isDraft,assets,body,tagName',
    ]);

    if (view.status !== 0) {
        return [fail('draft', `gh release view ${tag} failed: ${view.output.trim()}`)];
    }

    let release: {
        isDraft: boolean,
        assets: {name: string}[],
        body: string,
        tagName: string,
    };

    try {
        release = JSON.parse(view.stdout) as typeof release;
    } catch {
        return [fail('draft', `gh release view ${tag} did not return JSON: ${JSON.stringify(view.stdout.slice(0, 80))}`)];
    }

    const results = [
        ...checkDraftState(release, tag),
        checkAssetSet(release.assets.map(asset => asset.name)),
    ];
    const dir = mkdtempSync(join(tmpdir(), 'stagistic-draft-'));

    try {
        const download = exec('gh', [
            'release',
            'download',
            tag,
            '--repo',
            REPOSITORY,
            '--dir',
            dir,
            '--clobber',
        ]);

        if (download.status !== 0) {
            return [...results, fail('download', download.output.trim())];
        }

        const read = (name: string): string => (existsSync(join(dir, name)) ? readFileSync(join(dir, name), 'utf8') : '');

        try {
            results.push(...checkLatestJson(JSON.parse(read(ASSET_NAMES.latest)), {
                version,
                signature: read(ASSET_NAMES.updaterSignature).trim(),
            }));
        } catch {
            results.push(fail('latest-json', 'latest.json missing or not valid JSON'));
        }

        results.push(...checkDmg(join(dir, ASSET_NAMES.dmg), {
            version,
            allowAdHoc,
        }));
    } finally {
        rmSync(dir, {
            recursive: true,
            force: true,
        });
    }

    return results;
};

const get = async (url: string, redirect: RequestRedirect = 'follow'): Promise<{
    status: number,
    headers: Headers,
    body: string,
}> => {
    const response = await fetch(url, {redirect});

    return {
        status: response.status,
        headers: response.headers,
        body: await response.text(),
    };
};

const attempt = async (name: string, run: () => Promise<CheckResult | CheckResult[]>): Promise<CheckResult[]> => {
    try {
        const result = await run();

        return Array.isArray(result) ? result : [result];
    } catch (error) {
        return [fail(name, `request failed: ${(error as Error).message}`)];
    }
};

export const checkLive = async (version: string): Promise<CheckResult[]> => {
    const results: CheckResult[] = [];

    results.push(...await attempt('live-latest-json', async () => {
        const latest = await get(`https://github.com/${REPOSITORY}/releases/latest/download/latest.json`);

        return checkLiveLatest(JSON.parse(latest.body), version);
    }));

    results.push(...await attempt('live-download', async () => {
        let url = `${SITE}/download/mac`;
        let last = fail('live-download', 'no redirect');

        for (let hop = 0; hop < 5; hop++) {
            const response = await get(url, 'manual');
            const location = response.headers.get('location');

            last = checkDownloadRedirect(location, version);

            if (last.status === 'PASS' || location === null) {
                break;
            }

            url = new URL(location, url).toString();
        }

        return last;
    }));

    results.push(...await attempt('live-notice', async () => {
        const notice = await get(`${SITE}/desktop/notice.json`);

        return checkNotice(notice.status, notice.headers.get('content-type'), notice.body, notice.headers.get('cache-control'));
    }));

    results.push(...await attempt('live-changelog', async () => {
        const page = await get(`${SITE}/changelog`);

        return checkContains('live-changelog', page.status, page.body, version);
    }));

    results.push(...await attempt('live-docs', async () => checkStatus('live-docs', (await get(`${DOCS}/mac-app/`)).status)));

    results.push(...await attempt('live-web-version', async () => checkWebVersion(JSON.parse((await get(`${WEB_APP}/version.json`)).body), version)));

    return results;
};

