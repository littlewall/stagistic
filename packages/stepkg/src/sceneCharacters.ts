import {getScriptBlockId, type ScriptDocument} from '@stagistic/script';

import type {
    StepkgExportIssue,
    StepkgSceneCharacter,
    StepkgSnapshot,
} from './contracts';
import type {StepkgImportIssue} from './importContracts';

const PATH = 'data/scene-characters.json';
const headingIds = (document: ScriptDocument) => new Set(document.content.filter(node => node.type === 'scene').map(getScriptBlockId));
const validRow = (value: unknown): value is StepkgSceneCharacter => {
    if (!value || typeof value !== 'object') return false;

    const row = value as Partial<StepkgSceneCharacter>;

    return typeof row.headingBlockId === 'string' && row.headingBlockId.length > 0
        && typeof row.characterId === 'string' && row.characterId.length > 0
        && (row.note === null || typeof row.note === 'string')
        && (row.arcValue === null || (typeof row.arcValue === 'number' && Number.isInteger(row.arcValue) && row.arcValue >= -3 && row.arcValue <= 3))
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

    let parsed: {items?: unknown};

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

    if (!parsed || !Array.isArray(parsed.items) || !parsed.items.every(validRow)) {
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
    const items = parsed.items.filter(row => {
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
