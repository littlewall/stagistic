import type {FountainElementType} from '@stagistic/script';
import clsx from 'clsx';

import baseStyles from '../base/FountainBlock.module.css';
import {ALL_BLOCK_BINDINGS} from '../registry';
import type {FountainBlockType} from './blockTypes';

const buildBlockTypeClassNames = (): Record<FountainBlockType, string> => {
    const map = {} as Record<FountainElementType, string>;

    for (const binding of ALL_BLOCK_BINDINGS) {
        map[binding.spec.legacyType] = binding.cssClass;
    }

    return map as Record<FountainBlockType, string>;
};

const BLOCK_TYPE_CLASS_NAMES: Record<FountainBlockType, string> = buildBlockTypeClassNames();

export const getFountainBlockClassName = (blockType: FountainBlockType) => clsx(
    baseStyles.block,
    BLOCK_TYPE_CLASS_NAMES[blockType],
);
