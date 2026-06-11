import type {ScriptDocument} from '@stagistic/script';

import {stripScriptSettings} from '../editorSettings';

export type SaveResult = boolean | void | Promise<boolean | void>;

export interface AutosaveSchedulePayload {
    value?: ScriptDocument,
    revision?: number,
    /**
     * Persist immediately, bypassing the debounce. Used for discrete, intentional
     * actions (scene reorder, act insert/delete/rename, block-type change) where
     * coalescing makes no sense — only continuous typing needs the debounce.
     */
    immediate?: boolean,
}

export const DEFAULT_AUTOSAVE_DELAY_MS = 1500;

export const serializeDocumentForSave = (value: ScriptDocument) => {
    return JSON.stringify(stripScriptSettings(value));
};

export const toRevision = (value: unknown) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
    }

    return Math.max(0, Math.trunc(value));
};

const isAutosaveSchedulePayload = (value: unknown): value is AutosaveSchedulePayload => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    return 'value' in value || 'revision' in value || 'immediate' in value;
};

export const resolveSchedulePayload = (
    input?: ScriptDocument | AutosaveSchedulePayload,
): AutosaveSchedulePayload => {
    if (!input) {
        return {};
    }

    if (isAutosaveSchedulePayload(input)) {
        return input;
    }

    return {
        value: input,
    };
};
