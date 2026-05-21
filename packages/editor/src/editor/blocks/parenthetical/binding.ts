import {parentheticalSpec} from '@stagistic/script';
import {ParentheticalBlockIcon} from '@stagistic/ui';

import type {FountainBlockBinding} from '../types';
import styles from './parenthetical.module.css';

export const parentheticalBinding: FountainBlockBinding = {
    spec: parentheticalSpec,
    cssClass: styles.parenthetical,
    cssVarPrefix: 'parenthetical',
    icon: ParentheticalBlockIcon,
};
