import type {FountainJSONContent} from '../document';
import {collectStructureBlocks} from './collectStructureBlocks';
import {SCRIPT_STRUCTURE_VERSION, type ScriptStructure} from './model';
import {normalizeMusicSegments} from './normalizeMusicSegments';

const sanitizeStructureRecord = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== 'object') {
        return {};
    }

    return value as Record<string, unknown>;
};

export const normalizeScriptStructure = (
    value: unknown,
    options?: {content?: FountainJSONContent[]},
): ScriptStructure => {
    const blocks = collectStructureBlocks(options?.content);

    if (blocks.length === 0) {
        return {
            version: SCRIPT_STRUCTURE_VERSION,
            musicSegments: [],
        };
    }

    const record = sanitizeStructureRecord(value);

    return {
        version: SCRIPT_STRUCTURE_VERSION,
        musicSegments: normalizeMusicSegments(record.musicSegments, blocks),
    };
};

export type {StructureBlockEntry} from './collectStructureBlocks';
export {collectStructureBlocks} from './collectStructureBlocks';
