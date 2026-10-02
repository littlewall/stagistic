import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import {eq} from 'drizzle-orm';

import {extractScriptBlocks} from '../../blocks';
import {scripts} from '../../schema';
import type {ScriptRepository} from '../../types/scriptRepository';
import {readScriptSettings} from '../config/config';
import {getScriptLayoutFingerprint} from '../config/layoutFingerprint';
import type {GetDb, SyncDb} from '../types';
import {loadScriptDocumentFromProjection} from './documentProjection';
import {diffExtractedBlocks} from './persist/diffExtractedBlocks';

interface CreateSaveSummaryMetadataHandlerArgs {
    getDb: GetDb,
    syncDb: SyncDb,
}

const normalizeEditorDefaults = (node: ScriptNode): ScriptNode => {
    const next = {...node};

    if (node.type === 'musicStart' && node.attrs?.draft === false) {
        const {draft: _draft, ...attrs} = node.attrs;

        next.attrs = attrs;
    }

    if (node.content) {
        next.content = node.content.map(normalizeEditorDefaults);
    }

    return next;
};

const extractSummaryBlocks = (scriptId: string, document: ScriptDocument) => {
    return extractScriptBlocks(scriptId, {
        ...document,
        content: document.content.map(normalizeEditorDefaults),
    }).blocks;
};

export const createSaveSummaryMetadataHandler = ({
    getDb,
    syncDb,
}: CreateSaveSummaryMetadataHandlerArgs): ScriptRepository['saveSummaryMetadata'] => {
    return async (scriptId, expectedDocument, metadata, expectedSettings) => {
        const db = await getDb();
        const expected = extractSummaryBlocks(scriptId, expectedDocument);
        const saved = await db.transaction(async tx => {
            if (expectedSettings !== undefined
                && getScriptLayoutFingerprint(await readScriptSettings(tx, scriptId)) !== getScriptLayoutFingerprint(expectedSettings)) {
                return false;
            }

            const loaded = await loadScriptDocumentFromProjection(tx, scriptId);

            if (!loaded) {
                return false;
            }

            const stored = extractSummaryBlocks(scriptId, loaded.document);
            const diff = diffExtractedBlocks(stored, expected);

            if (diff.inserted.length > 0 || diff.updated.length > 0 || diff.deletedIds.length > 0) {
                return false;
            }

            if (metadata.pageCount === null) {
                return false;
            }

            await tx.update(scripts).set({summaryMetadata: metadata}).where(eq(scripts.id, scriptId));

            return true;
        });

        if (saved) {
            await syncDb();
        }

        return saved;
    };
};
