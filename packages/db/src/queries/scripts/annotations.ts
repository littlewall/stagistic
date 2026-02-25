import {
    and,
    asc,
    eq,
} from 'drizzle-orm';

import {scriptBlockAnnotations} from '../../schema';
import type {DbClient} from '../types';

export interface UpsertScriptBlockAnnotationPayload {
    id: string,
    blockId: string,
    layerId: string,
    annotationType: string,
    startOffset: number | null,
    endOffset: number | null,
    anchorText: string | null,
    payloadJson: string,
    status: string,
    createdBy: string | null,
    createdAt: number,
    updatedAt: number,
}

export const listScriptBlockAnnotations = async (
    db: DbClient,
    blockId: string,
    layerId?: string,
) => {
    const whereClause = layerId
        ? and(
            eq(scriptBlockAnnotations.blockId, blockId),
            eq(scriptBlockAnnotations.layerId, layerId),
        )
        : eq(scriptBlockAnnotations.blockId, blockId);

    return db
        .select()
        .from(scriptBlockAnnotations)
        .where(whereClause)
        .orderBy(asc(scriptBlockAnnotations.createdAt));
};

export const listScriptLayerAnnotations = async (db: DbClient, layerId: string) => {
    return db
        .select()
        .from(scriptBlockAnnotations)
        .where(eq(scriptBlockAnnotations.layerId, layerId))
        .orderBy(asc(scriptBlockAnnotations.createdAt));
};

export const upsertScriptBlockAnnotation = async (
    db: DbClient,
    payload: UpsertScriptBlockAnnotationPayload,
) => {
    await db
        .insert(scriptBlockAnnotations)
        .values({
            id: payload.id,
            blockId: payload.blockId,
            layerId: payload.layerId,
            annotationType: payload.annotationType,
            startOffset: payload.startOffset,
            endOffset: payload.endOffset,
            anchorText: payload.anchorText,
            payloadJson: payload.payloadJson,
            status: payload.status,
            createdBy: payload.createdBy,
            createdAt: payload.createdAt,
            updatedAt: payload.updatedAt,
        })
        .onConflictDoUpdate({
            target: scriptBlockAnnotations.id,
            set: {
                layerId: payload.layerId,
                annotationType: payload.annotationType,
                startOffset: payload.startOffset,
                endOffset: payload.endOffset,
                anchorText: payload.anchorText,
                payloadJson: payload.payloadJson,
                status: payload.status,
                updatedAt: payload.updatedAt,
            },
        });
};

export const updateScriptBlockAnnotationStatus = async (
    db: DbClient,
    annotationId: string,
    status: string,
    updatedAt: number,
) => {
    await db
        .update(scriptBlockAnnotations)
        .set({
            status,
            updatedAt,
        })
        .where(eq(scriptBlockAnnotations.id, annotationId));
};

export const deleteScriptBlockAnnotation = async (db: DbClient, annotationId: string) => {
    await db.delete(scriptBlockAnnotations).where(eq(scriptBlockAnnotations.id, annotationId));
};
