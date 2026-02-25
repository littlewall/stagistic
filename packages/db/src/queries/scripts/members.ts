import {
    asc,
    eq,
} from 'drizzle-orm';

import {scriptMembers} from '../../schema';
import type {DbClient} from '../types';

export interface UpsertScriptMemberPayload {
    id: string,
    scriptId: string,
    userId: string,
    role: string,
    department: string | null,
    characterId: string | null,
    viewId: string | null,
    createdAt: number,
    updatedAt: number,
}

export const listScriptMembers = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptMembers)
        .where(eq(scriptMembers.scriptId, scriptId))
        .orderBy(asc(scriptMembers.createdAt));
};

export const upsertScriptMember = async (
    db: DbClient,
    payload: UpsertScriptMemberPayload,
) => {
    await db
        .insert(scriptMembers)
        .values({
            id: payload.id,
            scriptId: payload.scriptId,
            userId: payload.userId,
            role: payload.role,
            department: payload.department,
            characterId: payload.characterId,
            viewId: payload.viewId,
            createdAt: payload.createdAt,
            updatedAt: payload.updatedAt,
        })
        .onConflictDoUpdate({
            target: scriptMembers.id,
            set: {
                role: payload.role,
                department: payload.department,
                characterId: payload.characterId,
                viewId: payload.viewId,
                updatedAt: payload.updatedAt,
            },
        });
};

export const deleteScriptMember = async (db: DbClient, memberId: string) => {
    await db.delete(scriptMembers).where(eq(scriptMembers.id, memberId));
};
