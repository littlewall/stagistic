import {lyricsSpec} from '@stagistic/script';

import type {FountainBlockBinding} from '../types';
import styles from './lyrics.module.css';
import {LyricsIcon} from './icon';

export const lyricsBinding: FountainBlockBinding = {
    spec: lyricsSpec,
    cssClass: styles.lyrics,
    cssVarPrefix: 'lyrics',
    icon: LyricsIcon,
};
