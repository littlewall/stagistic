import {sceneSpec} from '@stagistic/script';
import {SceneHeadingBlockIcon} from '@stagistic/ui';

import type {BlockBinding} from '../types';
import styles from './scene.module.css';

export const sceneBinding: BlockBinding = {
    spec: sceneSpec,
    cssClass: styles.scene,
    cssVarPrefix: 'scene',
    icon: SceneHeadingBlockIcon,
};
