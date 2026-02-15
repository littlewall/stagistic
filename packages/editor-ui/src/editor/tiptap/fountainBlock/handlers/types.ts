import {
    type BlockCasing,
    type BlockShortcut,
} from '@stagistic/script-core';

import {type FountainBlockType} from '../../fountainCore';

export type HandlerMap<T> = Partial<Record<FountainBlockType, T>>;

export type BlockShortcutMap = Partial<Record<FountainBlockType, BlockShortcut>>;
export type BlockNextElementMap = Partial<Record<FountainBlockType, FountainBlockType>>;
export type BlockCasingMap = Partial<Record<FountainBlockType, BlockCasing>>;
