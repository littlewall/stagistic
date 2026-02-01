import {ELEMENT_DUAL_DIALOGUE_CHARACTER} from '@stagistic/editor-core';
import clsx from 'clsx';
import type {PlateElementProps} from 'platejs/react';
import {ReactNode} from 'react';

import FountainBlock from '../../base/FountainBlock';
import useDualColumnPlacement from '../../layout/useDualColumnPlacement';

import styles from './DualCharacterBlock.module.css';

const DualCharacterBlock = ({children, ...props}: PlateElementProps) => {
    const {className, style} = useDualColumnPlacement(
        ELEMENT_DUAL_DIALOGUE_CHARACTER,
    );

    return (
        <FountainBlock
            {...props}
            blockClassName={clsx(className, styles.dualCharacterBlock)}
            blockStyle={style}
            contentClassName={styles.dualCharacter}
            content={children as ReactNode}
        >
            {children}
        </FountainBlock>
    );
};

export default DualCharacterBlock;
