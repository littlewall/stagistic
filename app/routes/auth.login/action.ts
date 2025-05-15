import {ActionFunctionArgs} from '@remix-run/node';
import {parseWithValibot} from '@conform-to/valibot';
import {redirect} from '@remix-run/node';
import {sendMagicLinkFlow, MagicLinkError} from '~lib/auth/authentication.server';
import {MAGIC_LINK_ERRORS, MagicLinkErrorCode} from '~lib/auth/configs';
import {loginFormSchema} from './helpers';

const action = async ({request}: ActionFunctionArgs) => {
    const formData = await request.formData();
    const submission = parseWithValibot(formData, {schema: loginFormSchema});

    if (submission.status !== 'success') {
        return submission.reply();
    }

    try {
        const magicLinkHeaders = await sendMagicLinkFlow(request, {formData});

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
