import type {FountainElement} from '@stagistic/editor-core';
import {memo, type ReactElement} from 'react';
import {type Path} from 'slate';

import BlockControls from './BlockControls';

type BlockControlsWrapperProps = {
    icon?: ReactElement,
    label: string,
    visible: boolean,
    element: FountainElement,
    path: Path,
    blockId: string,
};

const BlockControlsWrapper = memo(({
    icon,
    label,
    visible,
    element,
    path,
    blockId,
}: BlockControlsWrapperProps) => {
    if (!visible) {
        return null;
    }

    return (
        <BlockControls
            icon={icon}
            label={label}
            visible={visible}
            element={element}
            path={path}
            blockId={blockId}
        />
    );
});

BlockControlsWrapper.displayName = 'BlockControlsWrapper';

export default BlockControlsWrapper;
