import type {ReactNode} from 'react';
import {createContext, useContext} from 'react';

export interface AuthenticityTokenProviderProps {
    children: ReactNode,
    token: string,
}

export interface AuthenticityTokenInputProps {
    name?: string,
}

const context = createContext<string | null>(null);

export const AuthenticityTokenProvider = ({
    children,
    token,
}: AuthenticityTokenProviderProps) => {
    return <context.Provider value={token}>{children}</context.Provider>;
};

export const useAuthenticityToken = () => {
    const token = useContext(context);

    if (!token) {
        throw new Error('Missing AuthenticityTokenProvider.');
    }

    return token;
};

export const AuthenticityTokenInput = ({
    name = 'csrf',
}: AuthenticityTokenInputProps) => {
    const token = useAuthenticityToken();

    return <input type="hidden" value={token} name={name} />;
};
