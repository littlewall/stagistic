import {getScriptBlockId, type ScriptDocument} from '@stagistic/script';
import {isArcValue} from '@stagistic/shared';

import type {
    StepkgExportIssue,
    StepkgSceneCharacter,
    StepkgSnapshot,
} from './contracts';
import type {StepkgImportIssue} from './importContracts';

const PATH = 'data/scene-characters.json';

/** `sceneCharacters.v2`: the file carries `version: 2`; v1 files have no version field. */
export const SCENE_CHARACTERS_VERSION = 2 as const;

/** v1 stored arcs as integers −3…3. */
const V1_ARC_SCALE = 33;

export const serializeSceneCharacters = (items: StepkgSceneCharacter[]) => ({version: SCENE_CHARACTERS_VERSION, items});

/** Lifts v1 records (arc −3…3, always on the card) to the v2 shape. */
const upgradeV1Row = (row: Omit<StepkgSceneCharacter, 'onCard'>): StepkgSceneCharacter => ({
    ...row,
    arcValue: row.arcValue === null ? null : row.arcValue * V1_ARC_SCALE,
    onCard: true,
});

/**
 * Upgrades the `sceneCharacters` of a stored snapshot payload; payloads written before v2 carry no
 * version. Any other version is unsupported (null), as in a .stepkg file.
 */
export const upgradeSceneCharactersPayload = (value: unknown): {items: StepkgSceneCharacter[]} | null => {
    const parsed = (value ?? {}) as {version?: unknown, items?: unknown};
    const items = Array.isArray(parsed.items) ? parsed.items as StepkgSceneCharacter[] : [];

    if (parsed.version === SCENE_CHARACTERS_VERSION) return {items};

    return parsed.version === undefined ? {items: items.map(upgradeV1Row)} : null;
};

const headingIds = (document: ScriptDocument) => new Set(document.content.filter(node => node.type === 'scene').map(getScriptBlockId));
const validRow = (value: unknown, version: 1 | 2 = 2): value is StepkgSceneCharacter => {
    if (!value || typeof value !== 'object') return false;

    const row = value as Partial<StepkgSceneCharacter>;

    return typeof row.headingBlockId === 'string' && row.headingBlockId.length > 0
        && typeof row.characterId === 'string' && row.characterId.length > 0
        && (row.note === null || typeof row.note === 'string')
        && (row.arcValue === null || (version === 1 ? typeof row.arcValue === 'number' && Number.isInteger(row.arcValue) && Math.abs(row.arcValue) <= 3 : isArcValue(row.arcValue)))
        && (version === 1 || typeof row.onCard === 'boolean')
        && typeof row.createdAt === 'string' && Number.isFinite(Date.parse(row.createdAt))
        && typeof row.updatedAt === 'string' && Number.isFinite(Date.parse(row.updatedAt));
};

export const readSceneCharacters = (bytes: Uint8Array | undefined, document: ScriptDocument, characterIds: ReadonlySet<string>):
    {
        ok: true,
        items: StepkgSceneCharacter[],
        issues: StepkgImportIssue[],
    } | {ok: false, issues: StepkgImportIssue[]} => {
    if (!bytes) return {
        ok: true,
        items: [],
        issues: [],
    };

    let parsed: {version?: unknown, items?: unknown};

    try {
        parsed = JSON.parse(new TextDecoder().decode(bytes)) as typeof parsed;
    } catch {
        return {
            ok: false,
            issues: [
                {
                    code: 'schema_invalid',
                    stage: 'schema',
                    path: PATH,
                },
            ],
        };
    }

    const isV2 = parsed?.version === SCENE_CHARACTERS_VERSION;
    const isV1 = parsed?.version === undefined;

    if (!parsed || !Array.isArray(parsed.items) || !(isV2 || isV1) || !parsed.items.every(row => validRow(row, isV2 ? 2 : 1))) {
        return {
            ok: false,
            issues: [
                {
                    code: 'schema_invalid',
                    stage: 'schema',
                    path: PATH,
                },
            ],
        };
    }

    const headings = headingIds(document);
    const issues: StepkgImportIssue[] = [];
    const seen = new Set<string>();
    const rows = isV2 ? parsed.items : (parsed.items as Omit<StepkgSceneCharacter, 'onCard'>[]).map(upgradeV1Row);
    const items = rows.filter(row => {
        const key = JSON.stringify([row.headingBlockId, row.characterId]);

        if (seen.has(key)) {
            issues.push({
                code: 'schema_invalid',
                stage: 'schema',
                path: PATH,
            });

            return false;
        }

        seen.add(key);

        if (headings.has(row.headingBlockId) && characterIds.has(row.characterId)) return true;

        issues.push({
            code: 'broken_reference',
            stage: 'validation',
            path: PATH,
            entity: {type: 'character', id: row.characterId},
            details: {headingBlockId: row.headingBlockId},
        });

        return false;
    });

    if (issues.some(issue => issue.code === 'schema_invalid')) return {ok: false, issues};

    return {
        ok: true,
        items,
        issues,
    };
};

export const validateSceneCharacters = (snapshot: StepkgSnapshot): StepkgExportIssue[] => {
    const headings = headingIds(snapshot.document);
    const characters = new Set(snapshot.characters.characters.map(row => row.id));
    const seen = new Set<string>();

    return snapshot.sceneCharacters.items.flatMap(row => {
        const key = JSON.stringify([row.headingBlockId, row.characterId]);
        const code = !validRow(row) ? 'invalid_snapshot'
            : seen.has(key) ? 'duplicate_id'
                : !headings.has(row.headingBlockId) || !characters.has(row.characterId) ? 'broken_reference' : null;

        seen.add(key);

        return code ? [
            {
                code,
                stage: 'validation' as const,
                path: PATH,
                entity: {type: 'character' as const, id: row.characterId},
            },
        ] : [];
    });
};
