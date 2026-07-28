import {characterSpec} from '@stagistic/script';
import {CharacterBlockIcon} from '@stagistic/ui';

import type {BlockBinding} from '../types';
import styles from './character.module.css';

export const characterBinding: BlockBinding = {
    spec: characterSpec,
    cssClass: styles.character,
    cssVarPrefix: 'character',
    icon: CharacterBlockIcon,
};
