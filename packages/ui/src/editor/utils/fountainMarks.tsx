import type { CSSProperties } from 'react';
import { PlateLeaf, type PlateLeafProps } from 'platejs/react';

type EmphasisLeafProps = PlateLeafProps & {
  leaf: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  };
};

export const FountainLeaf = ({ leaf, style, ...props }: EmphasisLeafProps) => {
  const emphasisStyle: CSSProperties = {};
  if (leaf.bold) emphasisStyle.fontWeight = 700;
  if (leaf.italic) emphasisStyle.fontStyle = 'italic';
  if (leaf.underline) emphasisStyle.textDecoration = 'underline';

  return <PlateLeaf {...props} leaf={leaf} style={{ ...style, ...emphasisStyle }} />;
};
