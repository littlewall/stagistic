import {actSpec} from '@stagistic/script';
import {ActBlockIcon} from '@stagistic/ui';

import type {FountainBlockBinding} from '../types';
import styles from './act.module.css';

export const actBinding: FountainBlockBinding = {
    spec: actSpec,
    cssClass: styles.act,
    cssVarPrefix: 'act',
    icon: ActBlockIcon,
};
