import clsx from 'clsx';

import baseStyles from '../base/Block.module.css';
import {ALL_BLOCK_BINDINGS} from '../registry';
import type {BlockNodeType} from './blockTypes';

const buildBlockTypeClassNames = (): Record<BlockNodeType, string> => {
    const map = {} as Record<BlockNodeType, string>;

    for (const binding of ALL_BLOCK_BINDINGS) {
        map[binding.spec.nodeType as BlockNodeType] = binding.cssClass;
    }

    return map;
};

const BLOCK_TYPE_CLASS_NAMES: Record<BlockNodeType, string> = buildBlockTypeClassNames();

export const getBlockClassName = (blockType: BlockNodeType) => clsx(
    baseStyles.block,
    BLOCK_TYPE_CLASS_NAMES[blockType],
);
