import type { PlateElementProps } from 'platejs/react';
import FountainBlock from '../../base/FountainBlock';
import { ELEMENT_DIALOGUE } from '@stagistic/editor-core';
import useDualColumnPlacement from '../../layout/useDualColumnPlacement';
import styles from './DialogueBlock.module.css';

const DialogueBlock = ({ children, ...props }: PlateElementProps) => {
  const { className, style } = useDualColumnPlacement(ELEMENT_DIALOGUE);

  return (
    <FountainBlock
      {...props}
      blockClassName={className}
      blockStyle={style}
      contentClassName={styles.dialogue}
      content={children}
    />
  );
};

export default DialogueBlock;
