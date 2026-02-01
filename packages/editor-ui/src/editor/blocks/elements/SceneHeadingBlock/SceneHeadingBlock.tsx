import {ELEMENT_SCENE_HEADING} from '@stagistic/editor-core';
import type {PlateElementProps} from 'platejs/react';
import {ReactNode} from 'react';

import FountainBlock from '../../base/FountainBlock';
import useDualColumnPlacement from '../../layout/useDualColumnPlacement';
import styles from './SceneHeadingBlock.module.css';

const SceneHeadingBlock = ({children, ...props}: PlateElementProps) => {
    const {className, style} = useDualColumnPlacement(ELEMENT_SCENE_HEADING);

    return (
        <FountainBlock
            {...props}
            blockClassName={className}
            blockStyle={style}
            contentClassName={styles.scene}
            content={children as ReactNode}
        >
            {children}
        </FountainBlock>
    );
};

export default SceneHeadingBlock;
