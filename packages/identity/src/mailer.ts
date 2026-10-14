import nodemailer from 'nodemailer';

/* Outgoing mail behind one interface: SMTP everywhere, a memory mailer in tests. */

export interface MailMessage {
    to: string,
    subject: string,
    text: string,
    html: string,
}

export interface Mailer {
    send(message: MailMessage): Promise<void>,
}

export interface MailSender {
    email: string,
    name: string,
}

export const DEFAULT_SENDER: MailSender = {email: 'no-reply@stagistic.app', name: 'Stagistic'};

/**
 * SMTP (nodemailer): Mailpit locally (`smtp://mailpit:1025`), Postmark or any
 * provider in production — only the URL changes, e.g.
 * `smtp://<server-token>:<server-token>@smtp.postmarkapp.com:587`.
 * `headers` are added to every message (Postmark: `X-PM-Message-Stream`).
 */
export const createSmtpMailer = ({
    url,
    from = DEFAULT_SENDER,
    headers = {},
}: {
    url: string,
    from?: MailSender,
    headers?: Record<string, string>,
}): Mailer => {
    const transport = nodemailer.createTransport(url);

    return {
        send: async message => {
            await transport.sendMail({
                from: {name: from.name, address: from.email},
                to: message.to,
                subject: message.subject,
                text: message.text,
                html: message.html,
                headers,
            });
        },
    };
};

/** `SMTP_HEADERS="X-PM-Message-Stream=outbound;Other=value"` -> headers. */
export const parseMailHeaders = (value: string | undefined): Record<string, string> => {
    const headers: Record<string, string> = {};

    for (const item of (value ?? '').split(';')) {
        const [name = '', header = ''] = item.split('=').map(part => part.trim());

        if (name && header) {
            headers[name] = header;
        }
    }

    return headers;
};

/** Keeps messages in memory (tests). */
export const createMemoryMailer = (): Mailer & {messages: MailMessage[]} => {
    const messages: MailMessage[] = [];

    return {
        messages,
        send: message => {
            messages.push(message);

            return Promise.resolve();
        },
    };
};
