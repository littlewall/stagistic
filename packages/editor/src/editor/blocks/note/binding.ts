import {noteSpec} from '@stagistic/script';
import {NoteBlockIcon} from '@stagistic/ui';

import type {BlockBinding} from '../types';
import styles from './note.module.css';

export const noteBinding: BlockBinding = {
    spec: noteSpec,
    cssClass: styles.note,
    cssVarPrefix: 'note',
    icon: NoteBlockIcon,
};
