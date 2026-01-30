import {ELEMENT_DUAL_DIALOGUE} from '@stagistic/editor-core';
import type {PlateElementProps} from 'platejs/react';
import {ReactNode} from 'react';

import FountainBlock from '~blocks/base/FountainBlock';
import useDualColumnPlacement from '~blocks/layout/useDualColumnPlacement';

import styles from './DualDialogueBlock.module.css';

const DualDialogueBlock = ({children, ...props}: PlateElementProps) => {
    const {className, style} = useDualColumnPlacement(ELEMENT_DUAL_DIALOGUE);

    return (
        <FountainBlock
            {...props}
            blockClassName={className}
            blockStyle={style}
            contentClassName={styles.dualDialogue}
            content={children as ReactNode}
        >
            {children}
        </FountainBlock>
    );
};

export default DualDialogueBlock;
