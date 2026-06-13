import {stageDirectionsSpec} from '@stagistic/script';
import {StageDirectionsBlockIcon} from '@stagistic/ui';

import type {FountainBlockBinding} from '../types';
import styles from './stageDirections.module.css';

export const stageDirectionsBinding: FountainBlockBinding = {
    spec: stageDirectionsSpec,
    cssClass: styles.stageDirections,
    cssVarPrefix: 'stage-directions',
    icon: StageDirectionsBlockIcon,
};
