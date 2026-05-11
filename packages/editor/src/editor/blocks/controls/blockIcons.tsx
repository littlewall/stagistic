import {
    ELEMENT_DUAL_DIALOGUE,
    type FountainElementType,
} from '@stagistic/script';
import type {ReactElement} from 'react';

import {ALL_BLOCK_BINDINGS} from '../registry';

const createIcon = (children: ReactElement | ReactElement[]) => (
    <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
    >
        {children}
    </svg>
);

const buildBlockIcons = (): Record<FountainElementType, ReactElement> => {
    const map = {} as Record<FountainElementType, ReactElement>;

    for (const binding of ALL_BLOCK_BINDINGS) {
        const Icon = binding.icon;

        map[binding.spec.legacyType] = <Icon />;
    }

    /*
     * ELEMENT_DUAL_DIALOGUE has no binding of its own (wrapper type
     * with no node); legacy toolbar code expects an icon for it.
     * Render a dedicated dual-column icon here.
     */
    map[ELEMENT_DUAL_DIALOGUE] = createIcon(
        <>
            <rect
                x="3"
                y="8"
                width="8"
                height="6"
                rx="2"
            />
            <rect
                x="13"
                y="6"
                width="8"
                height="6"
                rx="2"
            />
            <path d="M7 14l-3 2v-2" />
            <path d="M17 12l-2 2v-2" />
        </>,
    );

    return map;
};

export const BLOCK_ICONS: Record<FountainElementType, ReactElement> = buildBlockIcons();
