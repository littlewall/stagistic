import clsx from 'clsx';
import type { PlateElementProps } from 'platejs/react';
import FountainBlock from '../../base/FountainBlock';
import { ELEMENT_DUAL_DIALOGUE_CHARACTER } from '@stagistic/editor-core';
import useDualColumnPlacement from '../../layout/useDualColumnPlacement';
import styles from './DualCharacterBlock.module.css';

const DualCharacterBlock = ({ children, ...props }: PlateElementProps) => {
  const { className, style } = useDualColumnPlacement(
    ELEMENT_DUAL_DIALOGUE_CHARACTER
  );

  return (
    <FountainBlock
      {...props}
      blockClassName={clsx(className, styles.dualCharacterBlock)}
      blockStyle={style}
      contentClassName={styles.dualCharacter}
      content={children}
    />
  );
};

export default DualCharacterBlock;
