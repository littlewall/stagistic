import {
    type BlockCasing,
    type BlockShortcut,
} from '@stagistic/script';

import {type BlockNodeType} from '../../scriptCore';

export type HandlerMap<T> = Partial<Record<BlockNodeType, T>>;

export type BlockShortcutMap = Partial<Record<BlockNodeType, BlockShortcut>>;
export type BlockNextElementMap = Partial<Record<BlockNodeType, BlockNodeType>>;
export type BlockCasingMap = Partial<Record<BlockNodeType, BlockCasing>>;
