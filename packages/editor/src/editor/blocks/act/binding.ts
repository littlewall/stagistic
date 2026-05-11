import {actSpec} from '@stagistic/script';

import type {FountainBlockBinding} from '../types';
import styles from './act.module.css';
import {ActIcon} from './icon';

export const actBinding: FountainBlockBinding = {
    spec: actSpec,
    cssClass: styles.act,
    cssVarPrefix: 'act',
    icon: ActIcon,
};
