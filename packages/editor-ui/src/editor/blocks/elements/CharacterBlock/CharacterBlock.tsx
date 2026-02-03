import {ELEMENT_CHARACTER} from '@stagistic/editor-core';
import clsx from 'clsx';
import type {PlateElementProps} from 'platejs/react';
import {memo} from 'react';

import FountainBlock from '../../base/FountainBlock';
import useDualColumnPlacement from '../../layout/useDualColumnPlacement';
import styles from './CharacterBlock.module.css';

const CharacterBlock = ({children, ...props}: PlateElementProps) => {
    const {className, style} = useDualColumnPlacement(ELEMENT_CHARACTER);

    return (
        <FountainBlock
            {...props}
            blockClassName={clsx(className, styles.characterBlock)}
            blockStyle={style}
            contentClassName={styles.character}
        >
            {children}
        </FountainBlock>
    );
};

export default memo(CharacterBlock);
