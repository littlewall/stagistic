import {actSpec} from '@stagistic/script';
import {ActBlockIcon} from '@stagistic/ui';

import type {BlockBinding} from '../types';
import styles from './act.module.css';

export const actBinding: BlockBinding = {
    spec: actSpec,
    cssClass: styles.act,
    cssVarPrefix: 'act',
    icon: ActBlockIcon,
};
