import type {AccessTokenSource} from './accessToken';
import type {CloudAccount, CloudSyncStore} from './types';

export type AccountOnStart =
    | {kind: 'offline'}
    | {kind: 'signed-out'}
    /** Signed in and checked on this device before: go live. */
    | {kind: 'checked', account: CloudAccount}
    /** A sign-in this device has not checked yet: connect nothing until the check ran. */
    | {kind: 'needs-check', account: CloudAccount};

/** Who is signed in (session cookie → access token) and whether this device checked that account. */
export const resolveAccountOnStart = async ({
    tokens,
    store,
    log,
}: {
    tokens: AccessTokenSource,
    store: CloudSyncStore,
    log: (message: string, error?: unknown) => void,
}): Promise<AccountOnStart> => {
    let token: string | null;

    try {
        token = await tokens.get({force: true});
    } catch (error) {
        log('could not reach the auth service', error);

        return {kind: 'offline'};
    }

    const claims = tokens.claims();

    if (!token || !claims) {
        return {kind: 'signed-out'};
    }

    const stored = await store.getAccount();

    if (stored && stored.accountId === claims.accountId && stored.checked) {
        return {kind: 'checked', account: stored};
    }

    const account = {
        accountId: claims.accountId,
        email: claims.email,
        checked: false,
    };

    await store.setAccount(account);

    return {kind: 'needs-check', account};
};

/** The script was synced to this account before (it exists in the cloud). */
export const isSyncedToAccount = async (store: CloudSyncStore, scriptId: string, accountId: string | undefined) => {
    const states = await store.listSyncStates();

    return states.some(state => state.scriptId === scriptId && state.accountId === accountId);
};
