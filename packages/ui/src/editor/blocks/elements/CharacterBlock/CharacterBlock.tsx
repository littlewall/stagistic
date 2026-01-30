import {ELEMENT_CHARACTER} from '@stagistic/editor-core';
import clsx from 'clsx';
import type {PlateElementProps} from 'platejs/react';
import {ReactNode} from 'react';

import FountainBlock from '~blocks/base/FountainBlock';
import useDualColumnPlacement from '~blocks/layout/useDualColumnPlacement';

import styles from './CharacterBlock.module.css';

const CharacterBlock = ({children, ...props}: PlateElementProps) => {
    const {className, style} = useDualColumnPlacement(ELEMENT_CHARACTER);

    return (
        <FountainBlock
            {...props}
            blockClassName={clsx(className, styles.characterBlock)}
            blockStyle={style}
            contentClassName={styles.character}
            content={children as ReactNode}
        >
            {children}
        </FountainBlock>
    );
};

export default CharacterBlock;
