import {redirect} from '@remix-run/react';
import {
    createContext,
    useContext,
    useState,
    ReactNode,
    useCallback,
} from 'react';
import {User} from '~lib/db/entities/User';

interface AuthContextType {
    accessToken: string | null,
    user: User | null,
    setAccessToken: (token: string | null) => void,
    setUser: (user: User | null) => void,
    logout: () => Promise<void>,
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

    // Computed property to check if user is authenticated
    const isAuthenticated = Boolean(accessToken && user);

    // Logout function that clears auth state and calls logout endpoint
    const logout = useCallback(async () => {
        try {
            // Call the logout endpoint
            await fetch('/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });

            // Clear local state regardless of API response
            setAccessToken(null);
            setUser(null);

            // Reload the page to ensure clean state
            redirect('/auth/login');
        } catch (error) {
            console.error('Logout error:', error);
            // Still clear state on error
            setAccessToken(null);
            setUser(null);
        }
    }, []);

    return (
        <AuthContext.Provider value={{
            accessToken,
            user,
            setAccessToken,
            setUser,
            logout,
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
