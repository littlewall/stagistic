import type pg from 'pg';

import type {DocumentKind} from './documentName';

export type ScriptRole = 'owner' | 'editor' | 'commenter' | 'viewer';

/** Role of `userId` in a live (not deleted) script, or null. */
export const getScriptRole = async (pool: pg.Pool, scriptId: string, userId: string): Promise<ScriptRole | null> => {
    const {rows} = await pool.query<{role: ScriptRole}>(
        `select m.role from script_members m join scripts s on s.id = m.script_id
         where m.script_id = $1 and m.user_id = $2 and s.deleted_at is null`,
        [scriptId, userId],
    );

    return rows[0]?.role ?? null;
};

/** Commenters write only the comments doc; viewers write nothing. */
export const canWrite = (role: ScriptRole, kind: DocumentKind) => {
    if (role === 'owner' || role === 'editor') {
        return true;
    }

    return role === 'commenter' && kind === 'comments';
};
