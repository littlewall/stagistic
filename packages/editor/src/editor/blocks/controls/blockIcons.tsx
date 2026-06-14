import type {ScriptBlockNodeType} from '@stagistic/script';
import type {ReactElement} from 'react';

import {ALL_BLOCK_BINDINGS} from '../registry';

const buildBlockIcons = (): Record<ScriptBlockNodeType, ReactElement> => {
    const map = {} as Record<ScriptBlockNodeType, ReactElement>;

    for (const binding of ALL_BLOCK_BINDINGS) {
        const Icon = binding.icon;

        map[binding.spec.nodeType as ScriptBlockNodeType] = <Icon />;
    }

    return map;
};

export const BLOCK_ICONS: Record<ScriptBlockNodeType, ReactElement> = buildBlockIcons();
