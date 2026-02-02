import clsx from 'clsx';
import {
    PlateElement,
    type PlateElementProps,
    usePath,
} from 'platejs/react';
import type {CSSProperties, ReactNode} from 'react';
import {memo, useMemo} from 'react';
import {Path} from 'slate';

import {useEditorState} from '../../state/EditorStateProvider';
import BlockControlsWrapper from '../controls/BlockControlsWrapper';
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
    const {
        activeBlockPathString,
        activeBlockInfo,
        isEditorActive,
        selection,
    } = useEditorState();

    // Check if this block should show controls
    const shouldShowControls = useMemo(() => {
        if (!isEditorActive || !selection || !activeBlockInfo || !activeBlockPathString) return false;

        // Quick string comparison instead of Path.equals
        if (pathString !== activeBlockPathString) return false;

        // Must have selection within this block
        return Path.equals(selection.anchor.path, path) ||
            Path.isAncestor(path, selection.anchor.path);
    }, [
        isEditorActive,
        activeBlockPathString,
        pathString,
        selection,
        path,
        activeBlockInfo,
    ]);

    return (
        <PlateElement
            {...props}
            className={clsx(styles.block, blockClassName)}
            style={mergedStyle}
        >
            {shouldShowControls && activeBlockInfo && (
                <BlockControlsWrapper
                    icon={activeBlockInfo.icon}
                    label={activeBlockInfo.label}
                    visible={true}
                    element={activeBlockInfo.element}
                    path={activeBlockInfo.path}
                    blockId={activeBlockPathString}
                />
            )}
            <span className={clsx(styles.content, contentClassName)}>
                {content ?? children}
            </span>
        </PlateElement>
    );
};

export default memo(FountainBlock);
