import {actionSpec} from '@stagistic/script';

import type {FountainBlockBinding} from '../types';
import styles from './action.module.css';
import {ActionIcon} from './icon';

export const actionBinding: FountainBlockBinding = {
    spec: actionSpec,
    cssClass: styles.action,
    cssVarPrefix: 'action',
    icon: ActionIcon,
};
