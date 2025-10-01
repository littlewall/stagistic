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

export const sendMagicLinkSignupEmail: SendEmailFunction = async options => {
    try {
        await sendTemplateEmail(options.email, 'magic-link-signup', {
            magic_link: options.magicLink,
        });
    } catch (error) {
        console.error('Error sending signup magic link email:', error);
    }
};
