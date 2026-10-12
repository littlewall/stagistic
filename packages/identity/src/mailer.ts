/*
 * Outgoing mail behind one interface, over plain `fetch` (no SDK): Mailpit's
 * HTTP send API locally, Postmark in production (phase 7).
 */

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

/** Mailpit (`axllent/mailpit`) catches mail locally; `baseUrl` is its web/API port. */
export const createMailpitMailer = ({baseUrl, from = DEFAULT_SENDER}: {baseUrl: string, from?: MailSender}): Mailer => ({
    send: async message => {
        const response = await fetch(new URL('/api/v1/send', baseUrl), {
            method: 'POST',
            headers: {'content-type': 'application/json'},
            body: JSON.stringify({
                From: {Email: from.email, Name: from.name},
                To: [{Email: message.to}],
                Subject: message.subject,
                Text: message.text,
                HTML: message.html,
            }),
        });

        if (!response.ok) {
            throw new Error(`[identity] Mailpit send failed (${response.status}): ${await response.text()}`);
        }
    },
});

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
