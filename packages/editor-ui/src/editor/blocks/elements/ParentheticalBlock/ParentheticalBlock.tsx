import {ELEMENT_PARENTHETICAL} from '@stagistic/editor-core';
import type {PlateElementProps} from 'platejs/react';
import {memo} from 'react';

import FountainBlock from '../../base/FountainBlock';
import useDualColumnPlacement from '../../layout/useDualColumnPlacement';
import styles from './ParentheticalBlock.module.css';

const ParentheticalBlock = ({children, ...props}: PlateElementProps) => {
    const {className, style} = useDualColumnPlacement(ELEMENT_PARENTHETICAL);

    return (
        <FountainBlock
            {...props}
            blockClassName={className}
            blockStyle={style}
            contentClassName={styles.parenthetical}
        >
            <span className={styles.text}>{children}</span>
        </FountainBlock>
    );
};

export default memo(ParentheticalBlock);
