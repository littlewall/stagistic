import clsx from 'clsx';
import {
    PlateElement,
    type PlateElementProps,
} from 'platejs/react';
import type {CSSProperties, ReactNode} from 'react';
import {memo} from 'react';

import styles from './FountainBlock.module.css';

type FountainBlockProps = PlateElementProps & {
    blockClassName?: string,
    blockStyle?: CSSProperties,
    contentClassName?: string,
    content?: ReactNode,
};

const FountainBlock = ({
    children,
    blockClassName,
    blockStyle,
    contentClassName,
    content,
    ...props
}: FountainBlockProps) => {
    return (
        <PlateElement
            {...props}
            className={clsx(styles.block, blockClassName)}
            style={blockStyle}
        >
            <span className={clsx(styles.content, contentClassName)}>
                {content ?? children}
            </span>
        </PlateElement>
    );
};

export default memo(FountainBlock);
