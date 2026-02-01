import {ELEMENT_DIALOGUE} from '@stagistic/editor-core';
import type {PlateElementProps} from 'platejs/react';
import {ReactNode} from 'react';

import FountainBlock from '../../base/FountainBlock';
import useDualColumnPlacement from '../../layout/useDualColumnPlacement';

import styles from './DialogueBlock.module.css';

const DialogueBlock = ({children, ...props}: PlateElementProps) => {
    const {className, style} = useDualColumnPlacement(ELEMENT_DIALOGUE);

    return (
        <FountainBlock
            {...props}
            blockClassName={className}
            blockStyle={style}
            contentClassName={styles.dialogue}
            content={children as ReactNode}
        >
            {children}
        </FountainBlock>
    );
};

export default DialogueBlock;
