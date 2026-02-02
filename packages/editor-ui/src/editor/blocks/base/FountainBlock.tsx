import clsx from 'clsx';
import {
    PlateElement,
    type PlateElementProps,
    usePath,
} from 'platejs/react';
import type {CSSProperties, ReactNode} from 'react';
import {memo, useMemo} from 'react';

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
    style,
    ...props
}: FountainBlockProps) => {
    const mergedStyle = {...style, ...blockStyle};
    const path = usePath();
    const pathString = useMemo(() => path.join('-'), [path]);

    return (
        <PlateElement
            {...props}
            className={clsx(styles.block, blockClassName)}
            style={mergedStyle}
            data-block-id={pathString}
        >
            <span className={clsx(styles.content, contentClassName)}>
                {content ?? children}
            </span>
        </PlateElement>
    );
};

export default memo(FountainBlock);
