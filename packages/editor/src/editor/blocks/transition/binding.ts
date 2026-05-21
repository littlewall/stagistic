import {transitionSpec} from '@stagistic/script';
import {TransitionBlockIcon} from '@stagistic/ui';

import type {FountainBlockBinding} from '../types';
import styles from './transition.module.css';

export const transitionBinding: FountainBlockBinding = {
    spec: transitionSpec,
    cssClass: styles.transition,
    cssVarPrefix: 'transition',
    icon: TransitionBlockIcon,
};
