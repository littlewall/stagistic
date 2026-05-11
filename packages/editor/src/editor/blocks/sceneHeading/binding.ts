import {sceneHeadingSpec} from '@stagistic/script';

import type {FountainBlockBinding} from '../types';
import {SceneHeadingIcon} from './icon';
import styles from './sceneHeading.module.css';

export const sceneHeadingBinding: FountainBlockBinding = {
    spec: sceneHeadingSpec,
    cssClass: styles.scene,
    cssVarPrefix: 'scene-heading',
    icon: SceneHeadingIcon,
};
