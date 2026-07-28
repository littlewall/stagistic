import {type PaginationOptions} from './types';

/**
 * True when every provided setting already matches the current options —
 * lets `updatePaginationSettings` no-op instead of forcing a full re-measure
 * (important when re-attaching a cached editor surface).
 */
export const arePaginationSettingsApplied = (
    current: PaginationOptions,
    incoming: Partial<PaginationOptions>,
): boolean => (Object.keys(incoming) as (keyof PaginationOptions)[])
    .every(key => current[key] === incoming[key]);
