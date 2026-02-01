import {ELEMENT_LYRICS} from '@stagistic/editor-core';
import type {PlateElementProps} from 'platejs/react';
import {ReactNode} from 'react';

import FountainBlock from '../../base/FountainBlock';
import useDualColumnPlacement from '../../layout/useDualColumnPlacement';

import styles from './LyricsBlock.module.css';

const LyricsBlock = ({children, ...props}: PlateElementProps) => {
    const {className, style} = useDualColumnPlacement(ELEMENT_LYRICS);

    return (
        <FountainBlock
            {...props}
            blockClassName={className}
            blockStyle={style}
            contentClassName={styles.lyrics}
            content={children as ReactNode}
        >
            {children}
        </FountainBlock>
    );
};

export default LyricsBlock;
