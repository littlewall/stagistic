import type { PlateElementProps } from 'platejs/react';
import FountainBlock from '../../base/FountainBlock';
import { ELEMENT_CENTERED } from '@stagistic/editor-core';
import useDualColumnPlacement from '../../layout/useDualColumnPlacement';
import styles from './CenteredBlock.module.css';

const CenteredBlock = ({ children, ...props }: PlateElementProps) => {
  const { className, style } = useDualColumnPlacement(ELEMENT_CENTERED);

  return (
    <FountainBlock
      {...props}
      blockClassName={className}
      blockStyle={style}
      contentClassName={styles.centered}
      content={children}
    />
  );
};

export default CenteredBlock;
