export interface ListScriptsOptions {
    limit?: number,
}

export interface InsertScriptPayload {
    id: string,
    title: string,
    createdAt: number,
    updatedAt: number,
}

export interface UpdateScriptTitlePayload {
    id: string,
    title: string,
    updatedAt: number,
}

export interface UpdateActiveBlockPayload {
    scriptId: string,
    activeBlockId: string | null,
}

export interface UpdateScriptTimestampPayload {
    scriptId: string,
    updatedAt: number,
}

export interface ScriptConfigLookupPayload {
    scriptId: string,
    namespace: string,
}

export interface InsertScriptConfigPayload {
    id: string,
    scriptId: string,
    namespace: string,
    payloadJson: string | null,
    createdAt: number,
    updatedAt: number,
    schemaVersion: number,
}

export interface UpdateScriptConfigPayload {
    id: string,
    payloadJson: string | null,
    updatedAt: number,
    schemaVersion: number,
}

export interface DeleteScriptConfigPayload {
    scriptId: string,
    namespace: string,
}

export interface ScriptConfigReplacementRow {
    id: string,
    blockType: string,
    spacingBeforeMillis: number | null,
    lineHeightMillis: number | null,
    indentLeftChars: number | null,
    indentRightChars: number | null,
    shortcut: string | null,
    nextElement: string | null,
    textAlign: string | null,
    casing: string | null,
    isBold: boolean | null,
    isItalic: boolean | null,
    isUnderline: boolean | null,
    createdAt: number,
    updatedAt: number,
}

export interface ReplaceScriptConfigBlocksPayload {
    configId: string,
    rows: ScriptConfigReplacementRow[],
}

export interface InsertLatestPayload {
    scriptId: string,
    contentJson: string,
    contentHash: string,
    contentSize: number,
    updatedAt: number,
    schemaVersion: number,
}

export interface UpsertLatestPayload {
    scriptId: string,
    contentJson: string,
    contentHash: string,
    contentSize: number,
    updatedAt: number,
    schemaVersion: number,
}

export interface InsertVersionPayload {
    id: string,
    scriptId: string,
    message: string | null,
    contentJson: string,
    createdAt: number,
    schemaVersion: number,
}

export interface InsertOutboxPayload {
    id: string,
    scriptId: string | null,
    opType: string | null,
    payloadJson: string | null,
    createdAt: number | null,
    status: string,
}

export interface ScriptBlockIndexMetaUpsertPayload {
    scriptId: string,
    contentHash: string,
    indexSchemaVersion: number,
    status: 'ready' | 'stale' | 'building' | 'failed',
    updatedAt: number,
    lastError: string | null,
}

export interface ScriptBlockIndexRowsReplaceRow {
    scriptId: string,
    blockId: string,
    orderNo: number,
    blockType: string,
    textContent: string,
    actBlockId: string | null,
    sceneBlockId: string | null,
    columnGroupOrder: number | null,
    columnOrder: number | null,
    characterRefsJson: string | null,
    updatedAt: number,
}

export interface ScriptBlockIndexRowsReplacePayload {
    scriptId: string,
    rows: ScriptBlockIndexRowsReplaceRow[],
}

export interface UpsertScriptCharacterPayload {
    id: string,
    scriptId: string,
    characterKey: string,
    colorHex?: string | null,
    genderKey?: string | null,
    createdAt: number,
    updatedAt: number,
}

export interface DeleteScriptCharacterPayload {
    scriptId: string,
    characterId: string,
}

export interface UpdateScriptCharacterKeyPayload {
    scriptId: string,
    characterId: string,
    characterKey: string,
    updatedAt: number,
}

export interface TouchScriptCharacterPayload {
    scriptId: string,
    characterId: string,
    updatedAt: number,
}

export interface UpdateScriptCharacterColorPayload {
    scriptId: string,
    characterId: string,
    colorHex: string | null,
    updatedAt: number,
}

export interface UpdateScriptCharacterGenderPayload {
    scriptId: string,
    characterId: string,
    genderKey: string | null,
    updatedAt: number,
}

export interface UpsertScriptCharacterGenderPayload {
    id: string,
    scriptId: string,
    genderKey: string,
    genderLabel: string,
    createdAt: number,
    updatedAt: number,
}

export interface GetScriptCharacterGenderByKeyPayload {
    scriptId: string,
    genderKey: string,
}

export interface GetScriptCharacterByKeyPayload {
    scriptId: string,
    characterKey: string,
}

export interface GetScriptCharacterByIdPayload {
    scriptId: string,
    characterId: string,
}
