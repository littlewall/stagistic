/**
 * ProseMirror transaction meta key. When set truthy on a transaction, the editor
 * lifecycle treats the resulting `update` as a discrete, intentional change
 * (e.g. a block-type change) and persists it immediately instead of waiting for
 * the typing debounce.
 */
export const IMMEDIATE_SAVE_META_KEY = 'stagisticImmediateSave';
