import {
    asc,
    eq,
} from 'drizzle-orm';

import {scriptLayers} from '../../schema';
import type {DbClient} from '../types';

export interface UpsertScriptLayerPayload {
    id: string,
    scriptId: string,
    name: string,
    layerType: string,
    department: string,
    colorHex: string | null,
    isVisible: boolean,
    orderNo: number,
    createdBy: string | null,
    createdAt: number,
    updatedAt: number,
}

export const listScriptLayers = async (db: DbClient, scriptId: string) => {
    return db
        .select()
        .from(scriptLayers)
        .where(eq(scriptLayers.scriptId, scriptId))
        .orderBy(asc(scriptLayers.orderNo), asc(scriptLayers.name));
};

export const upsertScriptLayer = async (db: DbClient, payload: UpsertScriptLayerPayload) => {
    await db
        .insert(scriptLayers)
        .values({
            id: payload.id,
            scriptId: payload.scriptId,
            name: payload.name,
            layerType: payload.layerType,
            department: payload.department,
            colorHex: payload.colorHex,
            isVisible: payload.isVisible,
            orderNo: payload.orderNo,
            createdBy: payload.createdBy,
            createdAt: payload.createdAt,
            updatedAt: payload.updatedAt,
        })
        .onConflictDoUpdate({
            target: scriptLayers.id,
            set: {
                name: payload.name,
                layerType: payload.layerType,
                department: payload.department,
                colorHex: payload.colorHex,
                isVisible: payload.isVisible,
                orderNo: payload.orderNo,
                updatedAt: payload.updatedAt,
            },
        });
};

export const updateScriptLayerVisibility = async (
    db: DbClient,
    layerId: string,
    isVisible: boolean,
    updatedAt: number,
) => {
    await db
        .update(scriptLayers)
        .set({
            isVisible,
            updatedAt,
        })
        .where(eq(scriptLayers.id, layerId));
};

export const deleteScriptLayer = async (db: DbClient, layerId: string) => {
    await db.delete(scriptLayers).where(eq(scriptLayers.id, layerId));
};
