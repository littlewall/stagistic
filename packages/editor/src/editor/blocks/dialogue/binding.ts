import {dialogueSpec} from '@stagistic/script';
import {DialogueBlockIcon} from '@stagistic/ui';

import type {BlockBinding} from '../types';
import styles from './dialogue.module.css';

export const dialogueBinding: BlockBinding = {
    spec: dialogueSpec,
    cssClass: styles.dialogue,
    cssVarPrefix: 'dialogue',
    icon: DialogueBlockIcon,
};
