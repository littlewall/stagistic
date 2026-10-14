import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createSmtpMailer, parseMailHeaders} from './mailer';

/* Sends through the local Mailpit (docker-compose.dev.yml); skipped when it is not running. */
const SMTP_URL = process.env.IDENTITY_TEST_SMTP_URL ?? 'smtp://localhost:1025';
const MAILPIT_API = process.env.IDENTITY_TEST_MAILPIT_API ?? 'http://localhost:8025/api/v1';
const available = await fetch(`${MAILPIT_API}/info`).then(response => response.ok, () => false);

describe('parseMailHeaders', () => {
    it('reads name=value pairs separated by semicolons', () => {
        expect(parseMailHeaders(' X-PM-Message-Stream = outbound ;broken;A=b')).toEqual({'X-PM-Message-Stream': 'outbound', A: 'b'});
        expect(parseMailHeaders(undefined)).toEqual({});
    });
});

describe.skipIf(!available)('SMTP mailer', () => {
    it('delivers the message with the configured headers', async () => {
        const to = `smtp-${Date.now().toString(36)}@example.com`;

        await createSmtpMailer({url: SMTP_URL, headers: {'X-PM-Message-Stream': 'outbound'}}).send({
            to,
            subject: 'Sign in to Stagistic',
            text: 'https://editor.stagistic.local/auth/callback?token=t',
            html: '<p>Sign in</p>',
        });

        const found = await fetch(`${MAILPIT_API}/search?query=${encodeURIComponent(`to:${to}`)}`);
        const search = await found.json() as {messages: Array<{ID: string, Subject: string}>};

        expect(search.messages.map(message => message.Subject)).toEqual(['Sign in to Stagistic']);

        const headers = await (await fetch(`${MAILPIT_API}/message/${search.messages[0].ID}/headers`)).json() as Record<string, string[]>;

        expect(headers['X-Pm-Message-Stream'] ?? headers['X-PM-Message-Stream']).toEqual(['outbound']);
        expect(headers.From).toEqual(['Stagistic <no-reply@stagistic.app>']);
    });
});
