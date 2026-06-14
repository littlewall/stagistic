import {
    describe, expect, it,
} from 'vitest';

import {
    getScriptBlockNodeTypeFromBlockType,
    getScriptBlockTypeFromNodeType,
    isScriptBlockNodeType,
    isScriptBlockType,
    resolveScriptBlockNodeType,
    SCRIPT_BLOCK_NODE_TYPES,
    SCRIPT_BLOCK_TYPES,
} from './blockTypeMapping';

describe('block type mapping', () => {
    it('exposes the clean Stagistic vocabulary', () => {
        expect(new Set(SCRIPT_BLOCK_NODE_TYPES)).toEqual(new Set([
            'scene',
            'act',
            'stageDirection',
            'character',
            'aside',
            'dialogue',
            'lyrics',
            'note',
        ]));
        expect(new Set(SCRIPT_BLOCK_TYPES)).toEqual(new Set([
            'scene',
            'act',
            'stage_direction',
            'character',
            'aside',
            'dialogue',
            'lyrics',
            'note',
        ]));
    });

    it('round-trips nodeType <-> blockType', () => {
        for (const nodeType of SCRIPT_BLOCK_NODE_TYPES) {
            const blockType = getScriptBlockTypeFromNodeType(nodeType);

            expect(getScriptBlockNodeTypeFromBlockType(blockType)).toBe(nodeType);
        }
    });

    it('resolves both node and block identifiers, rejects legacy ones', () => {
        expect(resolveScriptBlockNodeType('stage_direction')).toBe('stageDirection');
        expect(resolveScriptBlockNodeType('stageDirection')).toBe('stageDirection');
        expect(resolveScriptBlockNodeType('scene')).toBe('scene');
        expect(resolveScriptBlockNodeType('fountain_action')).toBeNull();
        expect(resolveScriptBlockNodeType('scene_heading')).toBeNull();
        expect(isScriptBlockNodeType('parenthetical')).toBe(false);
        expect(isScriptBlockType('action')).toBe(false);
    });
});
