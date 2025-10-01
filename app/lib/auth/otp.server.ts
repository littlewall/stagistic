import {Session} from '@remix-run/node';
import jwt from 'jsonwebtoken';
import {generateId} from 'utils/id';

import globals from '~config/globals';
import {sendTemplateEmail} from '~lib/email/email.service';

const OTP_SESSION_KEY = 'dangerous-action-otp';
const OTP_EXPIRY_SEC = 60 * 5;
const JWT_SECRET = globals.get('auth.session.sessionSecret');

export const generateOtp = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

export const generateAndSendOtp = async ({
    email,
    userId,
    requestId,
    session,
}: {
    email: string,
    userId: string,
    requestId: string,
    session: Session,
}) => {
    const otp = generateOtp();
    const payload = {
        otp,
        userId,
        requestId,
    };
    const token = jwt.sign(payload, JWT_SECRET, {expiresIn: OTP_EXPIRY_SEC});

    session.set(OTP_SESSION_KEY, token);
    await sendTemplateEmail(email, 'dangerous-action-otp', {otp});

    return otp;
};

export const validateOtp = ({
    session,
    otp,
    userId,
    requestId,
}: {
    session: Session,
    otp: string,
    userId: string,
    requestId: string,
}): {valid: boolean, error?: string} => {
    const token = session.get(OTP_SESSION_KEY) as string | undefined;

    if (!token) {
        return {valid: false, error: 'OTP not found'};
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as {
            otp: string,
            userId: string,
            requestId: string,
        };

        // Trim whitespace from the received OTP
        const trimmedOtp = otp.trim();

        if (payload.otp !== trimmedOtp) {
            return {valid: false, error: 'Invalid OTP'};
        }

        if (payload.userId !== userId) {
            return {valid: false, error: 'Invalid user'};
        }

        if (payload.requestId !== requestId) {
            return {valid: false, error: 'Invalid request'};
        }

        return {valid: true};
    } catch (e) {
        return {valid: false, error: 'OTP expired or invalid'};
    }
};

export function clearOtp(session: Session) {
    session.unset(OTP_SESSION_KEY);
}

export function generateRequestId(): string {
    return generateId();
}
