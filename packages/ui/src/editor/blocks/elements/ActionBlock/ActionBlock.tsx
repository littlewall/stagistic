import {ELEMENT_ACTION} from '@stagistic/editor-core';
import type {PlateElementProps} from 'platejs/react';
import {ReactNode} from 'react';

import FountainBlock from '~blocks/base/FountainBlock';
import useDualColumnPlacement from '~blocks/layout/useDualColumnPlacement';

import styles from './ActionBlock.module.css';

const ActionBlock = ({children, ...props}: PlateElementProps) => {
    const {className, style} = useDualColumnPlacement(ELEMENT_ACTION);

    return (
        <FountainBlock
            {...props}
            blockClassName={className}
            blockStyle={style}
            contentClassName={styles.action}
            content={children as ReactNode}
        >
            {children}
        </FountainBlock>
    );
};

export default ActionBlock;
