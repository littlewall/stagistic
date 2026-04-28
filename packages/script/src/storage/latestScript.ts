/*
 * Phase 1: single default script latest state (local-only).
 * Next: multiple scripts + import/export, and remote cloud adapters.
 */

import type {ScriptDocument} from '../document/scriptDocument';

export interface LatestScriptStorage {
    loadLatestScript(): Promise<ScriptDocument | null>,
    saveLatestScript(value: ScriptDocument): Promise<void>,
    clearLatestScript(): Promise<void>,
}

export const LATEST_SCRIPT_KEY = 'default';
export const LATEST_SCRIPT_SCHEMA_VERSION = 2;
