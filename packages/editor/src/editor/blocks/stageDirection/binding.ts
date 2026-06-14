import {stageDirectionSpec} from '@stagistic/script';
import {StageDirectionsBlockIcon} from '@stagistic/ui';

import type {BlockBinding} from '../types';
import styles from './stageDirection.module.css';

export const stageDirectionBinding: BlockBinding = {
    spec: stageDirectionSpec,
    cssClass: styles.stageDirection,
    cssVarPrefix: 'stage-direction',
    icon: StageDirectionsBlockIcon,
};
