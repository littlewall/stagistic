import {
    createContext,
    ReactNode,
    useContext,
    useState,
} from 'react';

import {User} from '~lib/db/entities/User';

interface AuthContextType {
    accessToken: string | null,
    user: User | null,
    setAccessToken: (token: string | null) => void,
    setUser: (user: User | null) => void,
    isAuthenticated: boolean,
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({
    children,
    initialAccessToken,
    initialUser,
}: {
    children: ReactNode,
    initialAccessToken?: string | null,
    initialUser?: User | null,
}) => {
    const [accessToken, setAccessToken] = useState<string | null>(initialAccessToken || null);
    const [user, setUser] = useState<User | null>(initialUser || null);

    const isAuthenticated = Boolean(accessToken && user);

    return (
        <AuthContext.Provider value={{
            accessToken,
            user,
            setAccessToken,
            setUser,
            isAuthenticated,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};

export default AuthContext;
