import {asideSpec} from '@stagistic/script';
import {AsideBlockIcon} from '@stagistic/ui';

import type {FountainBlockBinding} from '../types';
import styles from './aside.module.css';

export const asideBinding: FountainBlockBinding = {
    spec: asideSpec,
    cssClass: styles.aside,
    cssVarPrefix: 'aside',
    icon: AsideBlockIcon,
};
