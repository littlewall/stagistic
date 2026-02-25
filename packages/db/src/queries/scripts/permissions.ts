import {
    asc,
    eq,
} from 'drizzle-orm';

import {scriptPermissions} from '../../schema';
import type {DbClient} from '../types';

export interface UpsertScriptPermissionPayload {
    id: string,
    scriptId: string,
    role: string,
    resourceType: string,
    action: string,
    conditionJson: string | null,
    createdAt: number,
    updatedAt: number,
}

export const listScriptPermissions = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptPermissions)
        .where(eq(scriptPermissions.scriptId, scriptId))
        .orderBy(
            asc(scriptPermissions.role),
            asc(scriptPermissions.resourceType),
            asc(scriptPermissions.action),
        );
};

export const upsertScriptPermission = async (
    db: DbClient,
    payload: UpsertScriptPermissionPayload,
) => {
    await db
        .insert(scriptPermissions)
        .values({
            id: payload.id,
            scriptId: payload.scriptId,
            role: payload.role,
            resourceType: payload.resourceType,
            action: payload.action,
            conditionJson: payload.conditionJson,
            createdAt: payload.createdAt,
            updatedAt: payload.updatedAt,
        })
        .onConflictDoUpdate({
            target: scriptPermissions.id,
            set: {
                role: payload.role,
                resourceType: payload.resourceType,
                action: payload.action,
                conditionJson: payload.conditionJson,
                updatedAt: payload.updatedAt,
            },
        });
};

export const deleteScriptPermission = async (db: DbClient, permissionId: string) => {
    await db
        .delete(scriptPermissions)
        .where(eq(scriptPermissions.id, permissionId));
};
