import {characterSpec} from '@stagistic/script';
import {CharacterBlockIcon} from '@stagistic/ui';

import type {FountainBlockBinding} from '../types';
import styles from './character.module.css';

export const characterBinding: FountainBlockBinding = {
    spec: characterSpec,
    cssClass: styles.character,
    cssVarPrefix: 'character',
    icon: CharacterBlockIcon,
};
