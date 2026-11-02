import type {BoardLens} from '@stagistic/ui';

/** Only built lenses are listed; Arcs and Numbers join as they arrive. */
export const BOARD_LENSES: readonly BoardLens[] = [
    {id: 'wall', label: 'Wall'},
    {id: 'matrix', label: 'Matrix'},
];

export const DEFAULT_BOARD_LENS_ID = 'wall';

export const isBoardLensId = (value: string | undefined): value is string => BOARD_LENSES.some(lens => lens.id === value);
