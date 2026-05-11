import {transitionSpec} from '@stagistic/script';

import type {FountainBlockBinding} from '../types';
import styles from './transition.module.css';
import {TransitionIcon} from './icon';

export const transitionBinding: FountainBlockBinding = {
    spec: transitionSpec,
    cssClass: styles.transition,
    cssVarPrefix: 'transition',
    icon: TransitionIcon,
};
