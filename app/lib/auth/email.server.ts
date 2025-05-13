import {sendTemplateEmail} from '~lib/email/email.service';

type SendEmailOptions = {
    email: string,
    magicLink: string,
};

type SendEmailFunction = (options: SendEmailOptions) => void | Promise<void>;

export const sendMagicLinkEmail: SendEmailFunction = async options => {
    try {
        await sendTemplateEmail(options.email, 'magic-link', {
            magic_link: options.magicLink,
        });
    } catch (error) {
        console.error('Error sending TOTP email:', error);
    }
};
