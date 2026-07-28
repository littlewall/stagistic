import {asideSpec} from '@stagistic/script';
import {AsideBlockIcon} from '@stagistic/ui';

import type {BlockBinding} from '../types';
import styles from './aside.module.css';

export const asideBinding: BlockBinding = {
    spec: asideSpec,
    cssClass: styles.aside,
    cssVarPrefix: 'aside',
    icon: AsideBlockIcon,
};
