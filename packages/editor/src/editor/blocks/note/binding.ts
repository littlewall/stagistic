import {noteSpec} from '@stagistic/script';
import {NoteBlockIcon} from '@stagistic/ui';

import type {FountainBlockBinding} from '../types';
import styles from './note.module.css';

export const noteBinding: FountainBlockBinding = {
    spec: noteSpec,
    cssClass: styles.note,
    cssVarPrefix: 'note',
    icon: NoteBlockIcon,
};
