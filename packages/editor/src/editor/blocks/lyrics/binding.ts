import {lyricsSpec} from '@stagistic/script';
import {LyricsBlockIcon} from '@stagistic/ui';

import type {BlockBinding} from '../types';
import styles from './lyrics.module.css';

export const lyricsBinding: BlockBinding = {
    spec: lyricsSpec,
    cssClass: styles.lyrics,
    cssVarPrefix: 'lyrics',
    icon: LyricsBlockIcon,
};
