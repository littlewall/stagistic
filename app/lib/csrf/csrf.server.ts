import {type Session} from '@remix-run/node';
import {nanoid} from 'nanoid';

export const createAuthenticityToken = (session: Session, sessionKey = 'csrf') => {
    const token = session.get(sessionKey) as unknown;

    if (typeof token === 'string') {
        return token;
    }

    const newToken = nanoid();

    session.set(sessionKey, newToken);

    return newToken;
};

export const verifyAuthenticityToken = async (
    data: Request | FormData,
    session: Session,
    sessionKey = 'csrf',
) => {
    if (data instanceof Request && data.bodyUsed) {
        throw new Error(
            'The body of the request was read before calling verifyAuthenticityToken. Ensure you clone it before reading it.',
        );
    }

    const formData =
        data instanceof FormData ? data : await data.clone().formData();

    if (!session.has(sessionKey)) {
        throw new Error('Can\'t find CSRF token in session.');
    }

    if (!formData.get(sessionKey)) {
        throw new Error('Can\'t find CSRF token in body.');
    }

    if (formData.get(sessionKey) !== session.get(sessionKey)) {
        throw new Error('Can\'t verify CSRF token authenticity.');
    }
};
