import {dualDialogueCharacterSpec} from '@stagistic/script';

import type {FountainBlockBinding} from '../types';
import styles from './dualDialogueCharacter.module.css';
import {DualDialogueCharacterIcon} from './icon';

export const dualDialogueCharacterBinding: FountainBlockBinding = {
    spec: dualDialogueCharacterSpec,
    cssClass: styles.dualCharacter,
    cssVarPrefix: 'dual-character',
    icon: DualDialogueCharacterIcon,
};
