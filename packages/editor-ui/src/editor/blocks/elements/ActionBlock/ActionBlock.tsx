import type { PlateElementProps } from 'platejs/react';
import FountainBlock from '../../base/FountainBlock';
import { ELEMENT_ACTION } from '@stagistic/editor-core';
import useDualColumnPlacement from '../../layout/useDualColumnPlacement';
import styles from './ActionBlock.module.css';

const ActionBlock = ({ children, ...props }: PlateElementProps) => {
  const { className, style } = useDualColumnPlacement(ELEMENT_ACTION);

  return (
    <FountainBlock
      {...props}
      blockClassName={className}
      blockStyle={style}
      contentClassName={styles.action}
      content={children}
    />
  );
};

export default ActionBlock;
