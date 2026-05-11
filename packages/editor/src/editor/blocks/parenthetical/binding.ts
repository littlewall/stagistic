import {parentheticalSpec} from '@stagistic/script';

import type {FountainBlockBinding} from '../types';
import styles from './parenthetical.module.css';
import {ParentheticalIcon} from './icon';

export const parentheticalBinding: FountainBlockBinding = {
    spec: parentheticalSpec,
    cssClass: styles.parenthetical,
    cssVarPrefix: 'parenthetical',
    icon: ParentheticalIcon,
};
