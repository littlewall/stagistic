import type {MailMessage} from './mailer';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);

/**
 * Builds the link a user clicks: it opens the app (never the auth service), and
 * the app verifies the token against the auth service with credentials.
 * `verifyUrl` is Better Auth's verify URL; its `callbackURL` was already
 * checked against the trusted origins.
 */
export const buildAppMagicLink = ({
    verifyUrl,
    token,
    appOrigins,
}: {
    verifyUrl: string,
    token: string,
    appOrigins: string[],
}) => {
    const requested = new URL(verifyUrl).searchParams.get('callbackURL');
    let link: URL;

    try {
        link = new URL(requested ?? '/auth/callback', appOrigins[0]);
    } catch {
        link = new URL('/auth/callback', appOrigins[0]);
    }

    if (!appOrigins.includes(link.origin)) {
        link = new URL('/auth/callback', appOrigins[0]);
    }

    link.searchParams.set('token', token);

    return link.toString();
};

export const buildMagicLinkEmail = ({to, link}: {to: string, link: string}): MailMessage => ({
    to,
    subject: 'Sign in to Stagistic',
    text: `Open this link to sign in to Stagistic:\n\n${link}\n\nThe link expires in 10 minutes. If you did not ask to sign in, ignore this email.`,
    html: `<p>Open this link to sign in to Stagistic:</p><p><a href="${escapeHtml(link)}">Sign in</a></p>`
        + '<p>The link expires in 10 minutes. If you did not ask to sign in, ignore this email.</p>',
});
