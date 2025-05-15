import {SetCookie} from '@mjackson/headers';

export function createMagicLinkCookie(name: string, value: string, options: Partial<{
    maxAge: number, expires: Date, path: string, sameSite: 'Lax' | 'Strict' | 'None',
}> = {}) {
    return new SetCookie({
        name,
        value,
        httpOnly: true,
        path: '/',
        sameSite: 'Lax',
        ...options,
    });
}

export function deleteMagicLinkCookie(name: string) {
    return new SetCookie({
        name,
        value: '',
        httpOnly: true,
        path: '/',
        sameSite: 'Lax',
        maxAge: 0,
        expires: new Date(0),
    });
}
