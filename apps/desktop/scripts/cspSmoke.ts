/*
 * Loads the built UI (dist/) under the release Content Security Policy from
 * tauri.conf.json and fails on any CSP violation or uncaught page error.
 * Dev builds use the looser devCsp, so a CSP break only shows in a release
 * build (a blank window); this catches it before one is made.
 */
import {
    createReadStream,
    existsSync,
    readFileSync,
    statSync,
} from 'node:fs';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {extname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {chromium, webkit} from 'playwright';

const desktop = fileURLToPath(new URL('../', import.meta.url));
const dist = join(desktop, 'dist');
const config = JSON.parse(readFileSync(join(desktop, 'src-tauri/tauri.conf.json'), 'utf8')) as {app: {security: {csp: string}}};
const TYPES: Record<string, string> = {
    '.css': 'text/css',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm',
    '.woff2': 'font/woff2',
};

if (!existsSync(join(dist, 'index.html'))) {
    throw new Error(`Missing ${dist}/index.html; run desktop:build-ui first.`);
}

const server = createServer((request, response) => {
    const path = join(dist, decodeURIComponent((request.url ?? '/').split('?')[0]));
    const file = existsSync(path) && statSync(path).isFile() ? path : join(dist, 'index.html');

    response.writeHead(200, {
        'content-security-policy': config.app.security.csp,
        'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    });
    createReadStream(file).pipe(response);
});

await new Promise<void>(resolve => {
    server.listen(0, '127.0.0.1', resolve);
});

const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
const failures: string[] = [];

try {
    // WebKit is what the Mac app runs; Chromium reports violations with more detail.
    for (const browserType of [webkit, chromium]) {
        const browser = await browserType.launch();

        try {
            const page = await browser.newPage();
            const problems: string[] = [];

            await page.exposeFunction('reportCspViolation', (detail: string) => {
                problems.push(`CSP violation: ${detail}`);
            });
            await page.addInitScript(() => {
                document.addEventListener('securitypolicyviolation', event => {
                    void (window as unknown as {reportCspViolation: (detail: string) => Promise<void>})
                        .reportCspViolation(`${event.violatedDirective} blocked ${event.blockedURI || 'inline/eval'} at ${event.sourceFile}:${event.lineNumber}:${event.columnNumber}`);
                });
            });
            page.on('pageerror', error => {
                problems.push(`Page error: ${error.message}`);
            });
            await page.goto(url);
            // The app then waits for Tauri, which a plain browser does not have; that error is expected.
            await page.waitForTimeout(3000);

            const rendered = await page.evaluate(() => (document.getElementById('root')?.childElementCount ?? 0) > 0);

            if (!rendered) {
                problems.push('Nothing rendered into #root.');
            }

            failures.push(...problems.map(problem => `${browserType.name()}: ${problem}`));
            console.log(`${problems.length === 0 ? 'PASS' : 'FAIL'}  ${browserType.name()}`);
        } finally {
            await browser.close();
        }
    }
} finally {
    server.close();
}

if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exit(1);
}
