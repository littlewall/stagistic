import {existsSync} from 'node:fs';
import {resolve} from 'node:path';

import {checkApp, checkDmg} from './verifyArtifacts';
import {
    type CheckResult,
    fail,
    formatResult,
    parseVerifyArgs,
    summarize,
} from './verifyLib';
import {checkDraft, checkLive} from './verifyRemote';

// moon runs the task in apps/desktop; resolve paths from where it was invoked.
const fromInvocation = (path: string | undefined): string | undefined => {
    return path === undefined ? undefined : resolve(process.env.MOON_WORKING_DIR ?? process.cwd(), path);
};

const main = async (): Promise<void> => {
    const parsed = parseVerifyArgs(process.argv.slice(2));
    const args = {
        ...parsed,
        dmg: fromInvocation(parsed.dmg),
        app: fromInvocation(parsed.app),
    };
    let results: CheckResult[];

    if (args.dmg !== undefined) {
        results = checkDmg(args.dmg, args);
    } else if (args.app !== undefined) {
        results = existsSync(args.app) ? checkApp(args.app, args) : [fail('app', `not found: ${args.app}`)];
    } else if (args.draft !== undefined) {
        results = checkDraft(args.draft, args.allowAdHoc);
    } else {
        results = await checkLive(args.live ?? '');
    }

    for (const result of results) {
        console.log(formatResult(result));
    }

    const summary = summarize(results);

    console.log(summary.line);
    process.exit(summary.failed ? 1 : 0);
};

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
