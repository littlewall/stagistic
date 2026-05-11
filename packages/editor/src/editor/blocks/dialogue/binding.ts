import {dialogueSpec} from '@stagistic/script';

import type {FountainBlockBinding} from '../types';
import styles from './dialogue.module.css';
import {DialogueIcon} from './icon';

export const dialogueBinding: FountainBlockBinding = {
    spec: dialogueSpec,
    cssClass: styles.dialogue,
    cssVarPrefix: 'dialogue',
    icon: DialogueIcon,
};
