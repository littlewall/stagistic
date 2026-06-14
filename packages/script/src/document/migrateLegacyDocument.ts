import {
    getScriptBlockNodeTypeFromBlockType,
    isScriptBlockType,
} from '../syntax';
import type {ScriptDocument, ScriptNode} from './scriptDocument';

/**
 * TEMPORARY one-shot migration.
 *
 * Upgrades a single locally-stored test script authored before the
 * Fountain → Stagistic clean break: it remaps the old node/block
 * identifiers to the new vocabulary, coerces the legacy monolithic
 * `fountainBlock` node into per-type nodes, and normalizes the legacy
 * `+` multi-character delimiter to `/`.
 *
 * Delete this file (and its call in useScriptLoader) once the test
 * script has been opened and saved once. It is not part of the lasting
 * data model — there is no production data to migrate.
 */

const LEGACY_BLOCK_NODE_NAME = 'fountainBlock';

/** Old camelCase node types whose name changed. */
const LEGACY_NODE_TYPE_REMAP: Record<string, string> = {
    sceneHeading: 'scene',
    action: 'stageDirection',
    parenthetical: 'aside',
};

/** Old stored blockType ids (snake_case + `fountain_*` legacy) → new node type. */
const LEGACY_BLOCK_TYPE_REMAP: Record<string, string> = {
    scene_heading: 'scene',
    action: 'stageDirection',
    parenthetical: 'aside',
    fountain_scene_heading: 'scene',
    fountain_act: 'act',
    fountain_action: 'stageDirection',
    fountain_character: 'character',
    fountain_parenthetical: 'aside',
    fountain_dialogue: 'dialogue',
    fountain_lyrics: 'lyrics',
    fountain_note: 'note',
};

const resolveLegacyBlockTypeToNodeType = (blockType: unknown): string => {
    if (typeof blockType === 'string') {
        if (LEGACY_BLOCK_TYPE_REMAP[blockType]) {
            return LEGACY_BLOCK_TYPE_REMAP[blockType];
        }

        if (isScriptBlockType(blockType)) {
            return getScriptBlockNodeTypeFromBlockType(blockType);
        }
    }

    return 'stageDirection';
};

const normalizeCharacterDelimiter = (text: string): string => text.replace(/\s*\+\s*/g, ' / ');

export interface MigrateLegacyDocumentResult {
    document: ScriptDocument,
    changed: boolean,
}

export const migrateLegacyDocument = (input: ScriptDocument): MigrateLegacyDocumentResult => {
    let changed = false;

    const migrateText = (node: ScriptNode, parentNodeType: string | undefined): ScriptNode => {
        if (parentNodeType !== 'character' || typeof node.text !== 'string') {
            return node;
        }

        const normalized = normalizeCharacterDelimiter(node.text);

        if (normalized === node.text) {
            return node;
        }

        changed = true;

        return {...node, text: normalized};
    };

    const migrateNode = (node: ScriptNode): ScriptNode => {
        let next = node;

        if (node.type === LEGACY_BLOCK_NODE_NAME) {
            const nodeType = resolveLegacyBlockTypeToNodeType(node.attrs?.blockType);
            const {blockType: _legacyBlockType, ...attrs} = node.attrs ?? {};

            next = {
                ...node, type: nodeType, attrs,
            };
            changed = true;
        } else if (typeof node.type === 'string' && LEGACY_NODE_TYPE_REMAP[node.type]) {
            next = {...node, type: LEGACY_NODE_TYPE_REMAP[node.type]};
            changed = true;
        }

        if (Array.isArray(next.content)) {
            next = {
                ...next,
                content: next.content.map(child => child.type === 'text'
                        ? migrateText(child, next.type)
                        : migrateNode(child),),
            };
        }

        return next;
    };

    const document: ScriptDocument = {
        ...input,
        content: input.content.map(migrateNode),
    };

    return {document, changed};
};
