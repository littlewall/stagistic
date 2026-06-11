import {actionSpec} from '@stagistic/script';
import {ActionBlockIcon} from '@stagistic/ui';

import type {FountainBlockBinding} from '../types';
import styles from './action.module.css';

export const actionBinding: FountainBlockBinding = {
    spec: actionSpec,
    cssClass: styles.action,
    cssVarPrefix: 'action',
    icon: ActionBlockIcon,
};
