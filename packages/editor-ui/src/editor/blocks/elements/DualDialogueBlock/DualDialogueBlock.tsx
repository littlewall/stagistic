import {ELEMENT_DUAL_DIALOGUE} from '@stagistic/editor-core';
import type {PlateElementProps} from 'platejs/react';
import {memo} from 'react';

import FountainBlock from '../../base/FountainBlock';
import useDualColumnPlacement from '../../layout/useDualColumnPlacement';
import styles from './DualDialogueBlock.module.css';

const DualDialogueBlock = ({children, ...props}: PlateElementProps) => {
    const {className, style} = useDualColumnPlacement(ELEMENT_DUAL_DIALOGUE);

    return (
        <FountainBlock
            {...props}
            blockClassName={className}
            blockStyle={style}
            contentClassName={styles.dualDialogue}
        >
            {children}
        </FountainBlock>
    );
};

export default memo(DualDialogueBlock);
