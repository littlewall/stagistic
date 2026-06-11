/*
 * @stagistic/shared — pure TypeScript utilities with zero framework dependencies.
 * Consumed by @stagistic/script, @stagistic/db, @stagistic/editor, and
 * @stagistic/app-routes. Keeping it framework-free prevents circular deps and
 * lets any layer in the monorepo import it safely.
 */

export * from './ids/nodeId';
export * from './ids/uuidv7';
export * from './utils/number';
export * from './utils/object';
export * from './utils/platform';
export * from './utils/string';
