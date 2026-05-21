import {lyricsSpec} from '@stagistic/script';
import {LyricsBlockIcon} from '@stagistic/ui';

import type {FountainBlockBinding} from '../types';
import styles from './lyrics.module.css';

export const lyricsBinding: FountainBlockBinding = {
    spec: lyricsSpec,
    cssClass: styles.lyrics,
    cssVarPrefix: 'lyrics',
    icon: LyricsBlockIcon,
};
