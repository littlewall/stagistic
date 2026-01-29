// Phase 1: single default script latest state (local-only).
// Next: multiple scripts/projects + import/export, and remote cloud adapters.

// Plate/Slate values are JSON node arrays. Treat as opaque for storage.
export type SlateValue = unknown[];

export interface LatestScriptStorage {
  loadLatestScript(): Promise<SlateValue | null>;
  saveLatestScript(value: SlateValue): Promise<void>;
  clearLatestScript(): Promise<void>;
}

export const LATEST_SCRIPT_KEY = 'default';
export const LATEST_SCRIPT_SCHEMA_VERSION = 1;
