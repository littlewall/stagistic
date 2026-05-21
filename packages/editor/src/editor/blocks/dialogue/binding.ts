import {dialogueSpec} from '@stagistic/script';
import {DialogueBlockIcon} from '@stagistic/ui';

import type {FountainBlockBinding} from '../types';
import styles from './dialogue.module.css';

export const dialogueBinding: FountainBlockBinding = {
    spec: dialogueSpec,
    cssClass: styles.dialogue,
    cssVarPrefix: 'dialogue',
    icon: DialogueBlockIcon,
};
