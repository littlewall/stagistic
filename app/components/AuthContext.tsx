import React, {
    createContext,
    ReactNode,
    useContext,
    useState,
} from 'react';

import {Team} from '~lib/db/entities/Team';
import {User} from '~lib/db/entities/User';

interface AuthContextType {
    accessToken: string | null,
    user: User | null,
    setAccessToken: (token: string | null) => void,
    setUser: (user: User | null) => void,
    isAuthenticated: boolean,
    teams: Team[],
    setTeams: (teams: Team[]) => void,
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({
    children,
    initialAccessToken,
    initialUser,
    initialTeams = [],
}: {
    children: ReactNode,
    initialAccessToken?: string | null,
    initialUser?: User | null,
    initialTeams?: Team[],
}) => {
    const [accessToken, setAccessToken] = useState<string | null>(initialAccessToken || null);
    const [user, setUser] = useState<User | null>(initialUser || null);
    const [teams, setTeams] = useState<Team[]>(initialTeams);

    const isAuthenticated = Boolean(accessToken && user);

    return (
        <AuthContext.Provider value={{
            accessToken,
            user,
            setAccessToken,
            setUser,
            isAuthenticated,
            teams,
            setTeams,
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
