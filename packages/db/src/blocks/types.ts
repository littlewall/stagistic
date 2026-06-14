import type {ScriptDocument} from '@stagistic/script';

/** Public alias of the blocks-layer document shape consumed by extractScriptBlocks. */
export type RewriteScriptDocument = ScriptDocument;

export const FOUNTAIN_COLUMN_GROUP_NODE_NAME = 'fountainColumnGroup';
export const FOUNTAIN_COLUMN_NODE_NAME = 'fountainColumn';

const COLUMN_GROUP_ID_PREFIX = 'rw-column-group';
const ACT_ID_PREFIX = 'rw-act';
const SCENE_ID_PREFIX = 'rw-scene';
const TITLE_PAGE_FIELD_ID_PREFIX = 'rw-title-page-field';

export const makeColumnGroupId = (scriptId: string, orderNo: number) => {
    return `${COLUMN_GROUP_ID_PREFIX}:${scriptId}:${orderNo}`;
};

export const makeActId = (scriptId: string, headingBlockId: string) => {
    return `${ACT_ID_PREFIX}:${scriptId}:${headingBlockId}`;
};

export const makeSceneId = (scriptId: string, headingBlockId: string) => {
    return `${SCENE_ID_PREFIX}:${scriptId}:${headingBlockId}`;
};

export const makeTitlePageFieldId = (scriptId: string, orderNo: number) => {
    return `${TITLE_PAGE_FIELD_ID_PREFIX}:${scriptId}:${orderNo + 1}`;
};

export type RewriteMigrationStatus = 'success' | 'partial' | 'failed';

export interface RewriteBlocksMigrationAudit {
    scriptId: string,
    trigger: string,
    status: RewriteMigrationStatus,
    migratedAt: number,
    legacyBlockCount: number,
    storedBlockCount: number,
    storedCharacterRefCount: number,
    warnings: string[],
    error: string | null,
}

export interface RewriteStoredBlockRow {
    id: string,
    blockType: string,
    blockOrder: string,
    textContent: string,
    contentJson: string | null,
    columnGroupId: string | null,
    columnIndex: number | null,
}

export interface RewriteStoredBlockCharacterRefRow {
    blockId: string,
    characterKey: string,
    characterId: string,
}

export interface MigrateLegacyJsonToBlocksForScriptOptions {
    sourceDocument: ScriptDocument,
    force?: boolean,
    trigger?: string,
}

export interface ExtractedActRow {
    id: string,
    headingBlockId: string,
    name: string,
}

export interface ExtractedSceneRow {
    id: string,
    headingBlockId: string,
}

export interface ExtractedBlockRow {
    blockId: string,
    blockType: string,
    orderNo: number,
    textContent: string,
    contentJson: string | null,
    sceneHeadingBlockId: string | null,
    actHeadingBlockId: string | null,
    columnGroupId: string | null,
    columnIndex: number | null,
    characterRefByKey: Record<string, string>,
}

export interface ExtractedImportTitlePageField {
    fieldKey: string,
    fieldValue: string,
    orderNo: number,
}

export interface ExtractedImportMetadata {
    titlePageFields: ExtractedImportTitlePageField[] | null,
    sceneSynopsisByHeadingBlockId: Map<string, string>,
    warnings: string[],
}

export interface ExtractScriptBlocksResult {
    blocks: ExtractedBlockRow[],
    acts: ExtractedActRow[],
    scenes: ExtractedSceneRow[],
    importMetadata: ExtractedImportMetadata,
    warnings: string[],
}

export interface PersistExtractedBlocksResult {
    storedBlockCount: number,
    storedCharacterRefCount: number,
    warnings: string[],
}
