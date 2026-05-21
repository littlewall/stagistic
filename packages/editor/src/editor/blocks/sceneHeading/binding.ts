import {sceneHeadingSpec} from '@stagistic/script';
import {SceneHeadingBlockIcon} from '@stagistic/ui';

import type {FountainBlockBinding} from '../types';
import styles from './sceneHeading.module.css';

export const sceneHeadingBinding: FountainBlockBinding = {
    spec: sceneHeadingSpec,
    cssClass: styles.scene,
    cssVarPrefix: 'scene-heading',
    icon: SceneHeadingBlockIcon,
};
