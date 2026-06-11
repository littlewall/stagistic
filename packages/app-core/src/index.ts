/*
 * @stagistic/app-core — React hooks and context that wire @stagistic/db into
 * application state (script store, repository provider, list/detail hooks).
 * Sits between the DB layer and route-level app code so that web and desktop
 * apps can share the same hooks without duplicating DB integration.
 */

export * from './scripts';
