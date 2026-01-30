import {
    type PlateContentProps,
    PlateLeaf,
    type PlateLeafProps,
} from 'platejs/react';
import type {CSSProperties} from 'react';

type EmphasisLeaf = {
    bold?: boolean,
    italic?: boolean,
    underline?: boolean,
};

export const FountainLeaf: NonNullable<PlateContentProps['renderLeaf']> = props => {
    const {
        leaf, style, ...rest
    } = props as PlateLeafProps;
    const emphasisStyle: CSSProperties = {};
    const emphasisLeaf = leaf as EmphasisLeaf;

    if (emphasisLeaf.bold) {
        emphasisStyle.fontWeight = 700;
    }

    if (emphasisLeaf.italic) {
        emphasisStyle.fontStyle = 'italic';
    }

    if (emphasisLeaf.underline) {
        emphasisStyle.textDecoration = 'underline';
    }

    return (
        <PlateLeaf
            {...rest}
            leaf={leaf}
            style={{...style, ...emphasisStyle}}
        />
    );
};
