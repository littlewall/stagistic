import type postmark from 'postmark';
import {ServerClient} from 'postmark';

import globals from '~config/globals';

interface EmailConfig {
    apiKey: string,
    fromEmail: string,
}

export interface EmailTemplates {
    'magic-link': {
        magic_link: string,
    },
    'magic-link-signup': {
        magic_link: string,
    },
    'dangerous-action-otp': {
        otp: string,
    },
}

let client: postmark.ServerClient;
let fromEmail: string;

export const initEmailService = (config: EmailConfig): void => {
    client = new ServerClient(config.apiKey);
    fromEmail = config.fromEmail;
};

export const sendTemplateEmail = async <T extends keyof EmailTemplates>(
    to: string,
    templateId: T,
    templateVars: EmailTemplates[T],
    attachments?: postmark.Models.Attachment[],
): Promise<postmark.Models.MessageSendingResponse> => {
    if (!client) {
        const {token, fromEmail} = globals.get('api.postmark');

        initEmailService({
            apiKey: token,
            fromEmail: fromEmail,
        });
    }

    try {
        return await client.sendEmailWithTemplate({
            From: fromEmail,
            To: to,
            TemplateAlias: templateId as string,
            TemplateModel: templateVars,
            Attachments: attachments,
        });
    } catch (error) {
        console.error(`Failed to send email with template ${templateId}:`, error);
        throw error;
    }
};
