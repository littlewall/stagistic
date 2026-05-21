import {actionSpec} from '@stagistic/script';

import type {FountainBlockBinding} from '../types';
import styles from './action.module.css';
import {ActionBlockIcon} from '@stagistic/ui';

export const actionBinding: FountainBlockBinding = {
    spec: actionSpec,
    cssClass: styles.action,
    cssVarPrefix: 'action',
    icon: ActionBlockIcon,
};
