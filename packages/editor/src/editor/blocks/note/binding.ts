import {noteSpec} from '@stagistic/script';

import type {FountainBlockBinding} from '../types';
import {NoteIcon} from './icon';
import styles from './note.module.css';

export const noteBinding: FountainBlockBinding = {
    spec: noteSpec,
    cssClass: styles.note,
    cssVarPrefix: 'note',
    icon: NoteIcon,
};
