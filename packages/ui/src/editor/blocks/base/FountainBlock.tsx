import clsx from 'clsx';
import {PlateElement, type PlateElementProps} from 'platejs/react';
import type {CSSProperties, ReactNode} from 'react';

import BlockControls from '../controls/BlockControls';

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

    return (
        <PlateElement
            {...props}
            className={clsx(styles.block, blockClassName)}
            style={mergedStyle}
        >
            <BlockControls />
            <span className={clsx(styles.content, contentClassName)}>
                {content ?? children}
            </span>
        </PlateElement>
    );
};

export default FountainBlock;
