export type ServerRole = 'auth' | 'collab';

const ROLES: readonly ServerRole[] = ['auth', 'collab'];

/** `SERVER_ROLES=auth,collab` (default both); one image scales collab alone later. */
export const parseServerRoles = (value: string | undefined): Set<ServerRole> => {
    const roles = (value ?? 'auth,collab').split(',').map(item => item.trim()).filter(Boolean);
    const unknown = roles.filter(role => !ROLES.includes(role as ServerRole));

    if (unknown.length > 0 || roles.length === 0) {
        throw new Error(`[server] SERVER_ROLES must list ${ROLES.join(', ')} (got "${value}")`);
    }

    return new Set(roles as ServerRole[]);
};
