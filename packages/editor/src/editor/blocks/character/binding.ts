import {characterSpec} from '@stagistic/script';

import type {FountainBlockBinding} from '../types';
import styles from './character.module.css';
import {CharacterIcon} from './icon';

export const characterBinding: FountainBlockBinding = {
    spec: characterSpec,
    cssClass: styles.character,
    cssVarPrefix: 'character',
    icon: CharacterIcon,
};
