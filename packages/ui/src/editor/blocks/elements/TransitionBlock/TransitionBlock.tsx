import {ELEMENT_TRANSITION} from '@stagistic/editor-core';
import clsx from 'clsx';
import type {PlateElementProps} from 'platejs/react';
import {ReactNode} from 'react';

import FountainBlock from '~blocks/base/FountainBlock';
import useDualColumnPlacement from '~blocks/layout/useDualColumnPlacement';

import styles from './TransitionBlock.module.css';

const TransitionBlock = ({children, ...props}: PlateElementProps) => {
    const {className, style} = useDualColumnPlacement(ELEMENT_TRANSITION);

    return (
        <FountainBlock
            {...props}
            blockClassName={clsx(className, styles.transitionBlock)}
            blockStyle={style}
            contentClassName={styles.transition}
            content={children as ReactNode}
        >
            {children}
        </FountainBlock>
    );
};

export default TransitionBlock;
