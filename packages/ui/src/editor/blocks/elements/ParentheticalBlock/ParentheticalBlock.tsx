import type { PlateElementProps } from 'platejs/react';
import FountainBlock from '../../base/FountainBlock';
import { ELEMENT_PARENTHETICAL } from '@stagistic/editor-core';
import useDualColumnPlacement from '../../layout/useDualColumnPlacement';
import styles from './ParentheticalBlock.module.css';

const ParentheticalBlock = ({ children, ...props }: PlateElementProps) => {
  const { className, style } = useDualColumnPlacement(ELEMENT_PARENTHETICAL);

  return (
    <FountainBlock
      {...props}
      blockClassName={className}
      blockStyle={style}
      contentClassName={styles.parenthetical}
      content={<span className={styles.text}>{children}</span>}
    />
  );
};

export default ParentheticalBlock;
