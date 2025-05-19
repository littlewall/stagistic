import {ActionFunctionArgs} from '@remix-run/node';
import {parseWithValibot} from '@conform-to/valibot';
import {redirect} from '@remix-run/node';
import {sendMagicLinkFlow, MagicLinkError} from '~lib/auth/authentication.server';
import {MAGIC_LINK_ERRORS, MagicLinkErrorCode} from '~lib/auth/configs';
import {loginFormSchema} from './helpers';
import {getMagicLinkSession} from '~lib/auth/auth-session.server';
import {getSession} from '~lib/session.server';
import {verifyAuthenticityToken} from '~lib/csrf/csrf.server';

const action = async ({request}: ActionFunctionArgs) => {
    const session = await getSession(request.headers.get('cookie'));

    await verifyAuthenticityToken(request, session);

    const formData = await request.formData();
    const submission = parseWithValibot(formData, {schema: loginFormSchema});

    if (submission.status !== 'success') {
        return submission.reply();
    }

    try {
        const magicLinkSession = await getMagicLinkSession(
            request.headers.get('Cookie'),
        );
        const magicLinkHeaders = await sendMagicLinkFlow(submission.value.email, magicLinkSession);

        return redirect('/auth/login', {
            headers: magicLinkHeaders,
        });
    } catch (error) {
        if (error instanceof Headers) {
            throw redirect('/auth/login', {headers: error});
        }

        let errorKey: MagicLinkErrorCode = MagicLinkErrorCode.UNKNOWN;

        if (error instanceof MagicLinkError) {
            const code = String(error.code) as MagicLinkErrorCode;

            if (
                code === MagicLinkErrorCode.EMAIL_REQUIRED ||
                code === MagicLinkErrorCode.EMAIL_NOT_STRING ||
                code === MagicLinkErrorCode.USER_NOT_FOUND
            ) {
                errorKey = MagicLinkErrorCode.USER_NOT_FOUND;
            }

            if (code === MagicLinkErrorCode.EMAIL_INVALID) {
                errorKey = MagicLinkErrorCode.EMAIL_INVALID;
            }
        }

        return submission.reply({
            formErrors: [MAGIC_LINK_ERRORS[errorKey].message],
        });
    }
};

export default action;
