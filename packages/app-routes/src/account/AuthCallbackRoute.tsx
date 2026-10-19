import {Notice} from '@stagistic/ui';
import {
    useEffect,
    useRef,
    useState,
} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';

import {AppHeader} from '../layout/AppHeader';
import {useCloudAccount} from './CloudAccountProvider';

/**
 * `/auth/callback?token=…`: the magic link opens the app (never the auth
 * service); the token is exchanged for the session cookie here.
 */
export const AuthCallbackRoute = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const {completeSignIn} = useCloudAccount();
    const token = params.get('token');
    const [error, setError] = useState<string | null>(null);
    const displayError = token ? error : 'This sign-in link is incomplete. Request a new one from the account menu.';
    const started = useRef(false);

    useEffect(() => {
        if (started.current) {
            return;
        }

        started.current = true;

        if (!token) {
            return;
        }

        completeSignIn(token)
            .then(() => void navigate('/', {replace: true}))
            .catch(() => setError('This sign-in link is invalid or expired. Request a new one from the account menu.'));
    }, [
        completeSignIn,
        navigate,
        token,
    ]);

    return (
        <>
            <AppHeader showScriptActions={false} />
            {displayError ? <Notice variant="error">{displayError}</Notice> : null}
        </>
    );
};
