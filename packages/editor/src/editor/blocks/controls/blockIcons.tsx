import type {FountainElementType} from '@stagistic/script';
import type {ReactElement} from 'react';

import {ALL_BLOCK_BINDINGS} from '../registry';

const buildBlockIcons = (): Record<FountainElementType, ReactElement> => {
    const map = {} as Record<FountainElementType, ReactElement>;

    for (const binding of ALL_BLOCK_BINDINGS) {
        const Icon = binding.icon;

        map[binding.spec.legacyType] = <Icon />;
    }

    return map;
};

export const BLOCK_ICONS: Record<FountainElementType, ReactElement> = buildBlockIcons();
